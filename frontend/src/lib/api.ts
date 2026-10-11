import type {
  Change,
  ChangeApproval,
  ChangeRisk,
  ChangeStatus,
  ChangeType,
  CiEnvironment,
  CiCriticality,
  CiRelation,
  CiType,
  ConfigItem,
  EventKind,
  KbArticle,
  Practice,
  PracticeAll,
  Priority,
  Problem,
  ProblemStatus,
  Ticket,
  TicketStatus,
} from "./types";

const BASE = "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

export interface ApiTicket {
  id: number;
  code: string;
  practice: Practice;
  subject: string;
  description: string;
  requester: string;
  dept: string;
  priority: Priority;
  status: TicketStatus;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  attachments: Array<{ name: string; sizeKb: number }>;
  events: Array<{
    id: string;
    at: string;
    kind: EventKind;
    actor: string;
    detail: string | null;
    from: string | null;
    to: string | null;
  }>;
}

async function request<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    onUnauthorized?.();
    throw new ApiError(401, "Sesión expirada");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text || `Error ${res.status}`);
  }
  return (await res.json()) as T;
}

export function apiToTicket(dto: ApiTicket): Ticket {
  return {
    id: dto.code,
    practice: dto.practice,
    subject: dto.subject,
    description: dto.description,
    requester: dto.requester,
    dept: dto.dept,
    priority: dto.priority,
    status: dto.status,
    assignee: dto.assignee,
    createdAt: Date.parse(dto.createdAt),
    updatedAt: Date.parse(dto.updatedAt),
    resolvedAt: dto.resolvedAt ? Date.parse(dto.resolvedAt) : null,
    events: dto.events.map((ev) => ({
      id: ev.id,
      at: Date.parse(ev.at),
      kind: ev.kind,
      actor: ev.actor,
      detail: ev.detail ?? undefined,
      from: ev.from ?? undefined,
      to: ev.to ?? undefined,
    })),
    attachments: dto.attachments ?? [],
  };
}

/* ─── Problemas ─── */

export interface ApiProblem {
  code: string;
  title: string;
  description: string;
  status: ProblemStatus;
  causeRaiz: string | null;
  workaround: boolean;
  linkedIncidentCodes: string[];
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiChange {
  code: string;
  title: string;
  type: ChangeType;
  status: ChangeStatus;
  risk: ChangeRisk;
  ventana: string;
  description: string;
  solicita: string;
  implementador: string | null;
  ciIds: string[];
  approvals: ChangeApproval[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiCi {
  code: string;
  name: string;
  type: CiType;
  environment: CiEnvironment;
  criticality: CiCriticality;
  owner: string;
  relations: CiRelation[];
}

export interface ApiArticle {
  code: string;
  title: string;
  practice: PracticeAll;
  summary: string;
  sections: Array<{ heading: string; body: string }>;
  views: number;
  helpful: number;
  updatedAt: string;
}

export interface ApiNotification {
  id: number;
  routingKey: string;
  code: string | null;
  summary: string;
  audience: string;
  occurredAt: string;
}

export interface ApiMetric {
  day: string;
  practice: Practice;
  created: number;
  resolved: number;
  mttrMinutes: number;
  withinSla: number;
  openAtEnd: number;
  atRiskEnd: number;
}

export interface ApiClient {
  id: number;
  code: string;
  name: string;
  type: "interno" | "externo";
  email: string;
  phone: string;
  company: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const api = {
  health: (signal?: AbortSignal) =>
    request<{ status: string }>("/incidents/health", null, { signal }),

  login: (email: string, password: string) =>
    request<{ token: string; user: { name: string; email: string; role: string } }>(
      "/auth/login",
      null,
      { method: "POST", body: JSON.stringify({ email, password }) },
    ),

  listTickets: (token: string, limit?: number, offset?: number) =>
    request<ApiTicket[]>(
      `/incidents/tickets${limit ? `?limit=${limit}&offset=${offset ?? 0}` : ""}`,
      token,
    ),

  createTicket: (
    token: string,
    input: {
      practice: Practice;
      subject: string;
      description: string;
      requester: string;
      dept: string;
      priority: Priority;
      attachments?: Array<{ name: string; sizeKb: number }>;
    },
  ) =>
    request<ApiTicket>("/incidents/tickets", token, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  patchTicket: (
    token: string,
    code: string,
    patch: {
      status?: TicketStatus;
      assignee?: string;
      priority?: Priority;
      note?: string;
      actor?: string;
    },
  ) =>
    request<ApiTicket>(`/incidents/tickets/${code}`, token, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  uploadAttachment: (token: string, ticketCode: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/incidents/attachments/upload/${ticketCode}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async (res) => {
      if (!res.ok) throw new ApiError(res.status, await res.text());
      return res.json() as Promise<{
        name: string;
        sizeKb: number;
        objectName: string;
        uploaded: boolean;
      }>;
    });
  },

  listProblems: (token: string) =>
    request<ApiProblem[]>("/problems/problems", token),

  createProblem: (
    token: string,
    input: {
      title: string;
      description: string;
      linkedIncidentCodes?: string[];
      workaround?: boolean;
    },
  ) =>
    request<ApiProblem>("/problems/problems", token, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  patchProblem: (
    token: string,
    code: string,
    patch: { status?: ProblemStatus; causeRaiz?: string; actor?: string },
  ) =>
    request<ApiProblem>(`/problems/problems/${code}`, token, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  listChanges: (token: string) =>
    request<ApiChange[]>("/changes/changes", token),

  createChange: (
    token: string,
    input: {
      title: string;
      type: ChangeType;
      risk: ChangeRisk;
      ventana: string;
      description: string;
      solicita: string;
      ciIds?: string[];
    },
  ) =>
    request<ApiChange>("/changes/changes", token, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  patchChange: (
    token: string,
    code: string,
    patch: {
      decision?: { role: string; approve: boolean };
      status?: ChangeStatus;
      actor?: string;
    },
  ) =>
    request<ApiChange>(`/changes/changes/${code}`, token, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  listCis: (token: string) => request<ApiCi[]>("/cmdb/cis", token),

  listArticles: (token: string) =>
    request<ApiArticle[]>("/kb/articles", token),

  patchArticle: (token: string, code: string) =>
    request<ApiArticle>(`/kb/articles/${code}`, token, {
      method: "PATCH",
      body: JSON.stringify({ helpful: true }),
    }),

  listNotifications: (token: string, limit = 20) =>
    request<ApiNotification[]>(
      `/notifications/notifications?limit=${limit}`,
      token,
    ),

  getSmtpSettings: (token: string) =>
    request<{
      smtp: {
        host: string;
        port: number;
        user: string;
        pass: string | null;
        passStatus?: "set" | "empty" | "unreadable";
        from: string;
        secure: boolean;
        enabled: boolean;
        recipients: string[];
      };
    }>("/notifications/settings/smtp", token),

  updateSmtpSettings: (
    token: string,
    settings: {
      host?: string;
      port?: number;
      user?: string;
      pass?: string;
      from?: string;
      secure?: boolean;
      enabled?: boolean;
      recipients?: string[];
    },
  ) =>
    request("/notifications/settings/smtp", token, {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  testSmtp: (token: string) =>
    request<{ sent: boolean; message: string }>(
      "/notifications/settings/smtp/test",
      token,
      { method: "POST" },
    ),

  // ── Administración de usuarios (RBAC) ──
  listUsers: (token: string) =>
    request<{ email: string; name: string; role: string }[]>(
      "/auth/users",
      token,
    ),

  createUser: (
    token: string,
    body: { email: string; name: string; role: string; password: string },
  ) =>
    request("/auth/users", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateUser: (
    token: string,
    email: string,
    body: { name?: string; role?: string },
  ) =>
    request(
      `/auth/users/${encodeURIComponent(email)}`,
      token,
      { method: "PATCH", body: JSON.stringify(body) },
    ),

  listMetrics: (token: string, days = 14) =>
    request<ApiMetric[]>(
      `/incidents/metrics/daily?days=${days}`,
      token,
    ),

  // ── Clientes (interno/externo) ──
  listClients: (token: string) =>
    request<ApiClient[]>(
      "/clients/clients",
      token,
    ),

  createClient: (
    token: string,
    body: {
      name: string;
      type: "interno" | "externo";
      email?: string;
      phone?: string;
      company?: string;
      notes?: string;
    },
  ) =>
    request<ApiClient>("/clients/clients", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateClient: (
    token: string,
    code: string,
    body: {
      name?: string;
      type?: "interno" | "externo";
      email?: string;
      phone?: string;
      company?: string;
      notes?: string;
    },
  ) =>
    request<ApiClient>(
      `/clients/clients/${encodeURIComponent(code)}`,
      token,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
};

export function apiToProblem(dto: ApiProblem): Problem {
  return {
    id: dto.code,
    title: dto.title,
    description: dto.description,
    status: dto.status,
    causeRaiz: dto.causeRaiz,
    workaround: dto.workaround,
    linkedIncidentIds: dto.linkedIncidentCodes ?? [],
    assignee: dto.assignee,
    createdAt: Date.parse(dto.createdAt),
    updatedAt: Date.parse(dto.updatedAt),
  };
}

export function apiToChange(dto: ApiChange): Change {
  return {
    id: dto.code,
    title: dto.title,
    type: dto.type,
    status: dto.status,
    risk: dto.risk,
    ventana: dto.ventana,
    description: dto.description,
    solicita: dto.solicita,
    implementador: dto.implementador,
    ciIds: dto.ciIds ?? [],
    approvals: dto.approvals ?? [],
    createdAt: Date.parse(dto.createdAt),
    updatedAt: Date.parse(dto.updatedAt),
  };
}

export function apiToCi(dto: ApiCi): ConfigItem {
  return {
    id: dto.code,
    name: dto.name,
    type: dto.type,
    environment: dto.environment,
    criticality: dto.criticality,
    owner: dto.owner,
    relations: dto.relations ?? [],
  };
}

export function apiToArticle(dto: ApiArticle): KbArticle {
  return {
    id: dto.code,
    title: dto.title,
    practice: dto.practice,
    summary: dto.summary,
    sections: dto.sections ?? [],
    views: dto.views,
    helpful: dto.helpful,
    updatedAt: Date.parse(dto.updatedAt),
  };
}
