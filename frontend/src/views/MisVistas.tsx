import { useMemo } from "react";
import { TicketTable } from "../components/queue/TicketTable";
import { Module } from "../components/ui/Module";
import { slaOf } from "../lib/sla";
import { useStore } from "../lib/store";
import { OPEN_STATUSES } from "../lib/types";

/** Mis tickets: asignados al usuario actual, abiertos o recientes. */
export function MisTicketsView() {
  const { tickets, me, hydrating, hydrateFailed, reload } = useStore();

  const mine = useMemo(
    () =>
      tickets
        .filter((t) => t.assignee === me)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [tickets, me],
  );
  const openMine = mine.filter((t) => OPEN_STATUSES.includes(t.status));

  return (
    <div className="mx-auto max-w-[1200px] animate-rise">
      <h1 className="font-display text-[34px] leading-[1.1] font-extrabold tracking-tight">
        Mis tickets
      </h1>
      <p className="mt-1 text-[13px] text-ink-3">
        {openMine.length} abiertos asignados a {me}
      </p>
      <div className="mt-6">
        {hydrating ? (
          <Module title="Cargando…">
            <p className="px-5 py-8 text-center text-[13px] text-ink-3">
              Cargando tus tickets…
            </p>
          </Module>
        ) : hydrateFailed ? (
          <Module title="Error">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <p className="text-[13.5px] text-ink-2">
                No se pudo cargar la cola del servidor.
              </p>
              <button
                type="button"
                onClick={() => void reload()}
                className="text-[13px] font-bold text-amber link-grow"
              >
                Reintentar
              </button>
            </div>
          </Module>
        ) : (
          <TicketTable
            tickets={mine}
            emptyTitle="Sin tickets asignados"
            emptyHint="Toma un ticket desde la cola de incidentes o requerimientos."
          />
        )}
      </div>
    </div>
  );
}

/** Sin asignar: abiertos sin responsable, urgentes primero. */
export function SinAsignarView() {
  const { tickets, now, hydrating, hydrateFailed, reload } = useStore();

  const unassigned = useMemo(
    () =>
      tickets
        .filter(
          (t) =>
            OPEN_STATUSES.includes(t.status) &&
            t.assignee === null,
        )
        .sort((a, b) => slaOf(a, now).remainingMin - slaOf(b, now).remainingMin),
    [tickets, now, slaOf],
  );

  return (
    <div className="mx-auto max-w-[1200px] animate-rise">
      <h1 className="font-display text-[34px] leading-[1.1] font-extrabold tracking-tight">
        Sin asignar
      </h1>
      <p className="mt-1 text-[13px] text-ink-3">
        {unassigned.length} tickets abiertos sin responsable
      </p>
      <div className="mt-6">
        {hydrating ? (
          <Module title="Cargando…">
            <p className="px-5 py-8 text-center text-[13px] text-ink-3">
              Cargando la cola…
            </p>
          </Module>
        ) : hydrateFailed ? (
          <Module title="Error">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <p className="text-[13.5px] text-ink-2">
                No se pudo cargar la cola del servidor.
              </p>
              <button
                type="button"
                onClick={() => void reload()}
                className="text-[13px] font-bold text-amber link-grow"
              >
                Reintentar
              </button>
            </div>
          </Module>
        ) : (
          <TicketTable
            tickets={unassigned}
            initialSort={[{ id: "sla", desc: false }]}
            emptyTitle="Nada sin asignar"
            emptyHint="Todo ticket abierto tiene responsable. Toma un descanso."
          />
        )}
      </div>
    </div>
  );
}

/** Aprobaciones: cambios pendientes de decisión del usuario actual. */
export function AprobacionesView() {
  const { changes, hydrating } = useStore();

  const pending = useMemo(() => {
    return changes.filter(
      (c) =>
        c.status === "en_revision" &&
        c.approvals.some(
          (a: { role: string; state: string }) => a.state === "pendiente",
        ),
    );
  }, [changes]);
  return (
    <div className="mx-auto max-w-[1000px] animate-rise">
      <h1 className="font-display text-[34px] leading-[1.1] font-extrabold tracking-tight">
        Aprobaciones
      </h1>
      <p className="mt-1 text-[13px] text-ink-3">
        {pending.length} cambios esperando decisión del CAB
      </p>
      <div className="mt-6">
        {hydrating ? (
          <Module title="Cargando…">
            <p className="px-5 py-8 text-center text-[13px] text-ink-3">
              Cargando aprobaciones…
            </p>
          </Module>
        ) : pending.length === 0 ? (
          <Module title="Sin aprobaciones pendientes">
            <p className="px-5 py-8 text-center text-[15px] text-ink-3">
              No hay cambios esperando tu decisión.
            </p>
          </Module>
        ) : (
          <ul className="space-y-3">
            {pending.map((c) => (
              <li key={c.id}>
                <Module title={c.id} count={c.type}>
                  <div className="px-5 py-3">
                    <p className="text-[14px] font-semibold text-ink">{c.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {c.approvals.map((a: { role: string; state: string }, i: number) => (
                        <span
                          key={i}
                          className={`text-[12px] font-medium ${
                            a.state === "aprobado"
                              ? "text-good"
                              : a.state === "rechazado"
                                ? "text-signal"
                                : "text-ink-3"
                          }`}
                        >
                          {a.role}: {a.state}
                        </span>
                      ))}
                    </div>
                  </div>
                </Module>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
