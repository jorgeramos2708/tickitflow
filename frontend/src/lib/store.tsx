import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ME,
  seedArticles,
  seedChanges,
  seedCis,
  seedProblems,
  seedTickets,
} from "./data";
import { slaOf } from "./sla";
import {
  PRACTICE_PREFIX,
  TERMINAL_STATUSES,
  approvalsForChangeType,
  type Attachment,
  type Change,
  type ChangeRisk,
  type ChangeStatus,
  type ChangeType,
  type ConfigItem,
  type KbArticle,
  type Practice,
  type Priority,
  type Problem,
  type ProblemStatus,
  type Ticket,
  type TicketStatus,
} from "./types";
import {
  api,
  apiToArticle,
  apiToChange,
  apiToCi,
  apiToProblem,
  apiToTicket,
} from "./api";
import { useAuth } from "./auth";
import { useMode } from "./mode";

export interface CreateTicketInput {
  practice: Practice;
  subject: string;
  description: string;
  requester: string;
  dept: string;
  priority: Priority;
  attachments: Attachment[];
}

export interface CreateProblemInput {
  title: string;
  description: string;
  linkedIncidentIds: string[];
  workaround: boolean;
}

export interface CreateChangeInput {
  title: string;
  type: ChangeType;
  risk: ChangeRisk;
  ventana: string;
  description: string;
  solicita: string;
  ciIds: string[];
}

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  // Espejo de services/incidents/src/tickets.service.ts (ALLOWED)
  nuevo: ["asignado", "en_progreso", "cancelado"],
  asignado: ["en_progreso", "cancelado"],
  en_progreso: ["pendiente_usuario", "resuelto", "cancelado"],
  pendiente_usuario: ["en_progreso", "cancelado"],
  resuelto: ["cerrado", "en_progreso"],
  cerrado: [],
  cancelado: [],
};

interface StoreValue {
  tickets: Ticket[];
  problems: Problem[];
  changes: Change[];
  cis: ConfigItem[];
  articles: KbArticle[];
  now: number;
  me: string;
  hydrating: boolean;
  /** La hidratación en vivo falló — la cola vacía NO es un estado real */
  hydrateFailed: boolean;
  live: boolean;
  hasMoreTickets: boolean;
  loadMoreTickets: () => Promise<void>;
  /** Reintento manual tras una hidratación fallida */
  reload: () => Promise<void>;
  pulses: Record<string, number>;
  getTicket: (id: string) => Ticket | undefined;
  createTicket: (input: CreateTicketInput) => Promise<Ticket>;
  createProblem: (input: CreateProblemInput) => Promise<Problem>;
  createChange: (input: CreateChangeInput) => Promise<Change>;
  transition: (id: string, to: TicketStatus) => void;
  takeTicket: (id: string) => void;
  addNote: (id: string, text: string, actor?: string, isEndUser?: boolean) => void;
  /** Respuesta a un ticket terminal derivó a uno nuevo (de → a) */
  derivedNotice: { from: string; to: string } | null;
  clearDerivedNotice: () => void;
  allowedTransitions: (ticket: Ticket) => TicketStatus[];
  setProblemStatus: (id: string, to: ProblemStatus) => void;
  setProblemRootCause: (id: string, rca: string) => void;
  changeDecision: (id: string, role: string, approve: boolean) => void;
  setChangeStatus: (id: string, to: ChangeStatus) => void;
  markArticleHelpful: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { mode } = useMode();
  const { token: authToken, user: authUser } = useAuth();
  const live = mode === "live" && !!authToken;
  const me = live && authUser ? authUser.name : ME;

  const bootRef = useRef(Date.now());
  const [tickets, setTickets] = useState<Ticket[]>(() =>
    live ? [] : seedTickets(bootRef.current),
  );
  const [problems, setProblems] = useState<Problem[]>(() =>
    live ? [] : seedProblems(bootRef.current),
  );
  const [changes, setChanges] = useState<Change[]>(() =>
    live ? [] : seedChanges(bootRef.current),
  );
  const [cis, setCis] = useState<ConfigItem[]>(() =>
    live ? [] : seedCis(),
  );
  const [articles, setArticles] = useState<KbArticle[]>(() =>
    live ? [] : seedArticles(bootRef.current),
  );
  const [now, setNow] = useState(() => Date.now());
  const [pulses, setPulses] = useState<Record<string, number>>({});
  const [hydrating, setHydrating] = useState(live);
  const [hydrateFailed, setHydrateFailed] = useState(false);
  /** Aviso: respuesta a un ticket terminal derivó a uno nuevo vinculado */
  const [derivedNotice, setDerivedNotice] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [hasMoreTickets, setHasMoreTickets] = useState(false);
  const levelsRef = useRef<Record<string, string>>({});

  const pulse = useCallback((id: string) => {
    setPulses((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const replaceTicket = useCallback(
    (t: Ticket) => {
      setTickets((prev) => prev.map((x) => (x.id === t.id ? t : x)));
      pulse(t.id);
    },
    [pulse],
  );

  const replaceProblem = useCallback(
    (p: Problem) => {
      setProblems((prev) => prev.map((x) => (x.id === p.id ? p : x)));
      pulse(p.id);
    },
    [pulse],
  );

  const replaceChange = useCallback(
    (c: Change) => {
      setChanges((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      pulse(c.id);
    },
    [pulse],
  );

  const replaceArticle = useCallback(
    (a: KbArticle) => {
      setArticles((prev) => prev.map((x) => (x.id === a.id ? a : x)));
    },
    [],
  );

  const hydrate = useCallback(async () => {
    if (!live || !authToken) return;
    try {
      const [ticketDtos, problemDtos, changeDtos, ciDtos, articleDtos] =
        await Promise.all([
          api.listTickets(authToken, 100),
          api.listProblems(authToken),
          api.listChanges(authToken),
          api.listCis(authToken),
          api.listArticles(authToken),
        ]);
      setTickets(ticketDtos.map(apiToTicket));
      setProblems(problemDtos.map(apiToProblem));
      setChanges(changeDtos.map(apiToChange));
      setCis(ciDtos.map(apiToCi));
      setArticles(articleDtos.map(apiToArticle));
      // Si llegaron 100, probablemente hay más (paginación)
      setHasMoreTickets(ticketDtos.length >= 100);
      setHydrateFailed(false);
    } catch (err) {
      console.error("[store] hidratación falló:", err);
      // La cola vacía no es un estado real: exponer el fallo
      setTickets([]);
      setHydrateFailed(true);
    } finally {
      setHydrating(false);
    }
  }, [live, authToken]);

  /** Carga más tickets (paginación con infinite scroll). */
  const loadMoreTickets = useCallback(async () => {
    if (!live || !authToken || !hasMoreTickets) return;
    try {
      const offset = tickets.length;
      const more = await api.listTickets(authToken, 100, offset);
      if (more.length < 100) setHasMoreTickets(false);
      if (more.length > 0) {
        setTickets((prev) => {
          const existing = new Set(prev.map((t) => t.id));
          const newTickets = more
            .map(apiToTicket)
            .filter((t) => !existing.has(t.id));
          return [...prev, ...newTickets];
        });
      }
    } catch (err) {
      console.error("[store] loadMore falló:", err);
    }
  }, [live, authToken, hasMoreTickets, tickets.length]);

  useEffect(() => {
    if (live) {
      setHydrating(true);
      void hydrate();
    } else {
      setHydrating(false);
    }
  }, [live, hydrate]);

  // Detección de cruces de umbral SLA: el medidor se anuncia solo.
  useEffect(() => {
    const prev = levelsRef.current;
    const next: Record<string, string> = {};
    for (const ticket of tickets) {
      const { level } = slaOf(ticket, now);
      next[ticket.id] = level;
      const before = prev[ticket.id];
      if (before !== undefined && before !== level) {
        pulse(ticket.id);
      }
    }
    levelsRef.current = next;
  }, [tickets, now, pulse]);

  const getTicket = useCallback(
    (id: string) => tickets.find((t) => t.id === id),
    [tickets],
  );

  const mutate = useCallback(
    (id: string, fn: (ticket: Ticket, now: number) => Ticket) => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === id ? { ...fn(t, Date.now()), updatedAt: Date.now() } : t,
        ),
      );
      pulse(id);
    },
    [pulse],
  );

  const reconcile = useCallback(
    (id: string, run: () => Promise<Ticket>) => {
      if (!live || !authToken) return;
      run()
        .then(replaceTicket)
        .catch((err) => {
          console.error("[store] mutación rechazada, re-sincronizando:", err);
          void hydrate();
        });
    },
    [live, authToken, replaceTicket, hydrate],
  );

  const pushEvent = (
    ticket: Ticket,
    event: Omit<Ticket["events"][number], "id" | "at">,
    at: number,
  ): Ticket => ({
    ...ticket,
    events: [
      ...ticket.events,
      { ...event, id: `${ticket.id}-ev-${ticket.events.length}`, at },
    ],
  });

  const transition = useCallback(
    (id: string, to: TicketStatus) => {
      mutate(id, (ticket, at) => {
        if (!ALLOWED_TRANSITIONS[ticket.status].includes(to)) return ticket;
        const withEvent = pushEvent(
          ticket,
          { kind: "estado", actor: me, from: ticket.status, to },
          at,
        );
        if (to === "resuelto") {
          return { ...withEvent, status: to, resolvedAt: at };
        }
        return { ...withEvent, status: to };
      });
      reconcile(id, () =>
        api
          .patchTicket(authToken ?? "", id, { status: to })
          .then((dto) => apiToTicket(dto)),
      );
    },
    [mutate, reconcile, me, authToken],
  );

  const takeTicket = useCallback(
    (id: string) => {
      mutate(id, (ticket, at) => {
        if (ticket.assignee) return ticket;
        const withAssign = pushEvent(
          ticket,
          { kind: "asignacion", actor: "Sistema", to: me },
          at,
        );
        // Tomar un ticket nuevo lo pasa a Asignado (workflow: nuevo→asignado)
        if (ticket.status !== "nuevo") return { ...withAssign, assignee: me };
        const withStatus = pushEvent(
          { ...withAssign, assignee: me },
          { kind: "estado", actor: me, from: "nuevo", to: "asignado" },
          at,
        );
        return { ...withStatus, status: "asignado" };
      });
      reconcile(id, () =>
        api
          .patchTicket(authToken ?? "", id, {
            assignee: me,
            ...(getTicket(id)?.status === "nuevo" ? { status: "asignado" as const } : {}),
          })
          .then((dto) => apiToTicket(dto)),
      );
    },
    [mutate, reconcile, me, authToken, getTicket],
  );

  const createTicket = useCallback(
    async (input: CreateTicketInput): Promise<Ticket> => {
      if (live && authToken) {
        const dto = await api.createTicket(authToken, input);
        const ticket = apiToTicket(dto);
        setTickets((prev) => [ticket, ...prev]);
        setPulses((p) => ({ ...p, [ticket.id]: (p[ticket.id] ?? 0) + 1 }));
        return ticket;
      }
      const at = Date.now();
      const prefix = PRACTICE_PREFIX[input.practice];
      let maxNum = 2400;
      for (const t of tickets) {
        if (t.id.startsWith(`${prefix}-`)) {
          const n = Number(t.id.split("-")[1]);
          if (n > maxNum) maxNum = n;
        }
      }
      const id = `${prefix}-${maxNum + 1}`;
      const created: Ticket = {
        id,
        practice: input.practice,
        subject: input.subject,
        description: input.description,
        requester: input.requester,
        dept: input.dept,
        priority: input.priority,
        status: "nuevo",
        assignee: null,
        createdAt: at,
        updatedAt: at,
        resolvedAt: null,
        events: [
          {
            id: `${id}-ev-0`,
            at,
            kind: "creado",
            actor: input.requester,
            detail: "Registrado desde la consola de agentes.",
          },
          ...(input.attachments.length
            ? [
                {
                  id: `${id}-ev-1`,
                  at: at + 1000,
                  kind: "adjunto" as const,
                  actor: input.requester,
                  detail: input.attachments.map((a) => a.name).join(", "),
                },
              ]
            : []),
        ],
        attachments: input.attachments,
      };
      setTickets((prev) => [created, ...prev]);
      setPulses((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
      return created;
    },
    [live, authToken, tickets],
  );

  const addNote = useCallback(
    (id: string, text: string, actor: string = me, isEndUser = false) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const current = getTicket(id);
      if (!current) return;

      // Regla de reapertura — terminales: la respuesta del usuario deriva a
      // un ticket NUEVO vinculado; el original jamás se toca.
      if (isEndUser && TERMINAL_STATUSES.includes(current.status)) {
        if (live && authToken) {
          api
            .patchTicket(authToken, id, { note: trimmed, actor })
            .then((dto) => {
              const t = apiToTicket(dto);
              if (t.id !== id) {
                setTickets((prev) => [t, ...prev]);
                setDerivedNotice({ from: id, to: t.id });
              } else {
                replaceTicket(t);
              }
            })
            .catch(() => void hydrate());
        } else {
          void createTicket({
            practice: current.practice,
            subject: `Re: ${current.id} — ${current.subject}`,
            description:
              `Respuesta a ${current.id} (estado: ${current.status}):\n\n` +
              `${trimmed}\n\n` +
              `— Ticket generado automáticamente desde tu respuesta.`,
            requester: current.requester,
            dept: current.dept,
            priority: current.priority,
            attachments: [],
          }).then((t) => setDerivedNotice({ from: id, to: t.id }));
        }
        return;
      }

      mutate(id, (ticket, at) => {
        const withNote = pushEvent(
          ticket,
          { kind: "nota", actor, detail: trimmed },
          at,
        );
        // Demo — reapertura del usuario sobre resuelto (en live la aplica el backend)
        if (isEndUser && !live && ticket.status === "resuelto") {
          const withReopen = pushEvent(
            withNote,
            {
              kind: "estado",
              actor,
              from: "resuelto",
              to: "en_progreso",
              detail: "Reabierto — el usuario reportó que sigue fallando",
            },
            at,
          );
          return { ...withReopen, status: "en_progreso" };
        }
        return withNote;
      });
      reconcile(id, () =>
        api
          .patchTicket(authToken ?? "", id, { note: trimmed, actor })
          .then((dto) => apiToTicket(dto)),
      );
    },
    [mutate, reconcile, me, authToken, getTicket, live, hydrate, createTicket, replaceTicket],
  );

  const createProblem = useCallback(
    async (input: CreateProblemInput): Promise<Problem> => {
      if (live && authToken) {
        const dto = await api.createProblem(authToken, {
          title: input.title,
          description: input.description,
          linkedIncidentCodes: input.linkedIncidentIds,
          workaround: input.workaround,
        });
        const problem = apiToProblem(dto);
        setProblems((prev) => [problem, ...prev]);
        setPulses((p) => ({ ...p, [problem.id]: (p[problem.id] ?? 0) + 1 }));
        return problem;
      }
      const at = Date.now();
      let maxNum = 3000;
      for (const p of problems) {
        const n = Number(p.id.split("-")[1]);
        if (n > maxNum) maxNum = n;
      }
      const problem: Problem = {
        id: `PRB-${maxNum + 1}`,
        title: input.title,
        description: input.description,
        status: "nuevo",
        causeRaiz: null,
        workaround: input.workaround,
        linkedIncidentIds: input.linkedIncidentIds,
        assignee: null,
        createdAt: at,
        updatedAt: at,
      };
      setProblems((prev) => [problem, ...prev]);
      setPulses((p) => ({ ...p, [problem.id]: (p[problem.id] ?? 0) + 1 }));
      return problem;
    },
    [live, authToken, problems],
  );

  const createChange = useCallback(
    async (input: CreateChangeInput): Promise<Change> => {
      if (live && authToken) {
        const dto = await api.createChange(authToken, {
          title: input.title,
          type: input.type,
          risk: input.risk,
          ventana: input.ventana,
          description: input.description,
          solicita: input.solicita,
          ciIds: input.ciIds,
        });
        const change = apiToChange(dto);
        setChanges((prev) => [change, ...prev]);
        setPulses((p) => ({ ...p, [change.id]: (p[change.id] ?? 0) + 1 }));
        return change;
      }
      const at = Date.now();
      let maxNum = 4000;
      for (const c of changes) {
        const n = Number(c.id.split("-")[1]);
        if (n > maxNum) maxNum = n;
      }
      const change: Change = {
        id: `CHG-${maxNum + 1}`,
        title: input.title,
        type: input.type,
        status: input.type === "estandar" ? "aprobado" : "en_revision",
        risk: input.risk,
        ventana: input.ventana,
        description: input.description,
        solicita: input.solicita,
        implementador: null,
        ciIds: input.ciIds,
        approvals: approvalsForChangeType(input.type),
        createdAt: at,
        updatedAt: at,
      };
      setChanges((prev) => [change, ...prev]);
      setPulses((p) => ({ ...p, [change.id]: (p[change.id] ?? 0) + 1 }));
      return change;
    },
    [live, authToken, changes],
  );

  const allowedTransitions = useCallback(
    (ticket: Ticket) => ALLOWED_TRANSITIONS[ticket.status],
    [],
  );

  const setProblemStatus = useCallback(
    (id: string, to: ProblemStatus) => {
      setProblems((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: to, updatedAt: Date.now() } : p,
        ),
      );
      pulse(id);
      if (live && authToken) {
        api
          .patchProblem(authToken, id, { status: to, actor: me })
          .then((dto) => replaceProblem(apiToProblem(dto)))
          .catch((err) => {
            console.error("[store] problema rechazado:", err);
            void hydrate();
          });
      }
    },
    [pulse, live, authToken, me, replaceProblem, hydrate],
  );

  const setProblemRootCause = useCallback(
    (id: string, rca: string) => {
      setProblems((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, causeRaiz: rca, updatedAt: Date.now() } : p,
        ),
      );
      pulse(id);
      if (live && authToken) {
        api
          .patchProblem(authToken, id, { causeRaiz: rca, actor: me })
          .then((dto) => replaceProblem(apiToProblem(dto)))
          .catch((err) => {
            console.error("[store] problema rechazado:", err);
            void hydrate();
          });
      }
    },
    [pulse, live, authToken, me, replaceProblem, hydrate],
  );

  const changeDecision = useCallback(
    (id: string, role: string, approve: boolean) => {
      setChanges((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const approvals = c.approvals.map((a) =>
            a.role === role
              ? {
                  ...a,
                  state: approve
                    ? ("aprobado" as const)
                    : ("rechazado" as const),
                }
              : a,
          );
          let status = c.status;
          if (c.status === "en_revision" || c.status === "borrador") {
            if (approvals.some((a) => a.state === "rechazado")) {
              status = "rechazado";
            } else if (approvals.every((a) => a.state === "aprobado")) {
              status = "aprobado";
            } else {
              status = "en_revision";
            }
          }
          return { ...c, approvals, status, updatedAt: Date.now() };
        }),
      );
      pulse(id);
      if (live && authToken) {
        api
          .patchChange(authToken, id, {
            decision: { role, approve },
            actor: me,
          })
          .then((dto) => replaceChange(apiToChange(dto)))
          .catch((err) => {
            console.error("[store] decisión rechazada:", err);
            void hydrate();
          });
      }
    },
    [pulse, live, authToken, me, replaceChange, hydrate],
  );

  const setChangeStatus = useCallback(
    (id: string, to: ChangeStatus) => {
      setChanges((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: to, updatedAt: Date.now() } : c,
        ),
      );
      pulse(id);
      if (live && authToken) {
        api
          .patchChange(authToken, id, { status: to, actor: me })
          .then((dto) => replaceChange(apiToChange(dto)))
          .catch((err) => {
            console.error("[store] cambio rechazado:", err);
            void hydrate();
          });
      }
    },
    [pulse, live, authToken, me, replaceChange, hydrate],
  );

  const markArticleHelpful = useCallback(
    (id: string) => {
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, helpful: a.helpful + 1 } : a)),
      );
      if (live && authToken) {
        api
          .patchArticle(authToken, id)
          .then((dto) => replaceArticle(apiToArticle(dto)))
          .catch((err) => {
            console.error("[store] voto rechazado:", err);
            void hydrate();
          });
      }
    },
    [live, authToken, replaceArticle, hydrate],
  );

  const value: StoreValue = {
    tickets,
    problems,
    changes,
    cis,
    articles,
    now,
    me,
    hydrating,
  hydrateFailed,
    live,
    hasMoreTickets,
    loadMoreTickets,
  reload: hydrate,
    pulses,
    getTicket,
    createTicket,
    createProblem,
    createChange,
    transition,
    takeTicket,
    addNote,
    derivedNotice,
    clearDerivedNotice: () => setDerivedNotice(null),
    allowedTransitions,
    setProblemStatus,
    setProblemRootCause,
    changeDecision,
    setChangeStatus,
    markArticleHelpful,
  };

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore requiere StoreProvider");
  return ctx;
}
