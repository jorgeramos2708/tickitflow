import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Inbox } from "lucide-react";
import { cn } from "../../lib/cn";
import { fmtRelative, slaOf } from "../../lib/sla";
import { useStore } from "../../lib/store";
import type { Ticket } from "../../lib/types";
import { PracticeBadge, PriorityChip, StatusBadge } from "../ui/Chips";
import { SLAMeter } from "../ui/SLAMeter";

export interface TicketTableProps {
  tickets: Ticket[];
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  initialSort?: SortingState;
  /** Modo master-detail: la fila selecciona en vez de navegar. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

/** Columnas que se ocultan en viewports estrechos para que la tabla componga. */
const HIDE_ON: Record<string, string> = {
  practice: "hidden lg:table-cell",
  assignee: "hidden xl:table-cell",
  updated: "hidden lg:table-cell",
};

export function TicketTable({
  tickets,
  emptyTitle = "Sin tickets en esta vista",
  emptyHint = "Ajusta los filtros o registra un ticket nuevo.",
  emptyAction,
  initialSort,
  selectedId,
  onSelect,
}: TicketTableProps) {
  const { now, pulses } = useStore();
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Entrada escalonada solo en la primera carga: el retardo máximo
  // (6×50ms) + duración (450ms) = 750ms queda dentro del gate de 800ms,
  // y un pulse temprano no re-vuela la fila (la entrada se salta).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 800);
    return () => clearTimeout(t);
  }, []);

  const openRow = (id: string) => {
    if (onSelect) onSelect(id);
    else navigate(`/ticket/${id}`);
  };  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        id: "sla",
        header: "SLA",
        accessorFn: (t) => slaOf(t, now).remainingMin,
        cell: ({ row }) => <SLAMeter ticket={row.original} now={now} />,
      },
      {
        id: "id",
        header: "ID",
        accessorKey: "id",
        cell: ({ row }) => (
          <span className="font-mono text-[12.5px] tabular-nums text-ink-2">
            {row.original.id}
          </span>
        ),
      },
      {
        id: "subject",
        header: "Asunto",
        accessorKey: "subject",
        cell: ({ row }) => (
          <span className="block max-w-[420px] truncate text-[13.5px] font-semibold text-ink">
            {row.original.subject}
          </span>
        ),
      },
      {
        id: "practice",
        header: "Práctica",
        accessorKey: "practice",
        cell: ({ row }) => <PracticeBadge practice={row.original.practice} />,
      },
      {
        id: "priority",
        header: "Prioridad",
        accessorKey: "priority",
        cell: ({ row }) => <PriorityChip priority={row.original.priority} />,
      },
      {
        id: "status",
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "assignee",
        header: "Asignado",
        accessorFn: (t) => t.assignee ?? "zzz-none",
        cell: ({ row }) => {
          const a = row.original.assignee;
          return a ? (
            <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <span
                aria-hidden
                className="flex size-5 items-center justify-center rounded-md bg-ink/85 font-mono text-[9px] font-medium text-paper"
              >
                {a
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              {a.split(" ")[0]}
            </span>
          ) : (
            <span className="text-[12.5px] text-ink-3">Sin asignar</span>
          );
        },
      },
      {
        id: "updated",
        header: "Actualizado",
        accessorFn: (t) => t.updatedAt,
        cell: ({ row }) => (
          <span className="font-mono text-[12.5px] tabular-nums text-ink-3">
            {fmtRelative(row.original.updatedAt, now)}
          </span>
        ),
      },
    ],
    [now],
  );

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const focusRow = (id: string) => {
    const el = containerRef.current?.querySelector(
      `tr[data-id="${id}"]`,
    ) as HTMLTableRowElement | null;
    el?.focus();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (rows.length === 0) return;
    const index = rows.findIndex((r) => r.original.id === focusedId);
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(rows.length - 1, index + 1);
      setFocusedId(rows[next].original.id);
      focusRow(rows[next].original.id);
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(0, index - 1);
      setFocusedId(rows[prev].original.id);
      focusRow(rows[prev].original.id);
    } else if (e.key === "Enter") {
      if (focusedId) {
        e.preventDefault();
        openRow(focusedId);
      }
    }
  };

  // Al cambiar los datos, conserva el enfoque si el ticket sigue presente.
  useEffect(() => {
    if (focusedId && !tickets.some((t) => t.id === focusedId)) {
      setFocusedId(null);
    }
  }, [tickets, focusedId]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-rule-2 bg-raised px-6 py-16 text-center">
        <Inbox size={22} strokeWidth={1.5} aria-hidden className="text-ink-3" />
        <p className="text-[15px] font-semibold text-ink">{emptyTitle}</p>
        <p className="max-w-sm text-[15px] text-ink-3">{emptyHint}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-rule bg-raised shadow-1">
      <div ref={containerRef} onKeyDown={onKeyDown} className="overflow-x-auto">
        <TableShell>
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-rule bg-chip/60">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    scope="col"
                    className={cn(
                      "cursor-pointer px-3 py-2 text-left select-none",
                      HIDE_ON[header.id],
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    <span className="label inline-flex items-center gap-1 text-ink-3 hover:text-ink">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" ? (
                        <ChevronUp size={11} strokeWidth={2} aria-hidden />
                      ) : header.column.getIsSorted() === "desc" ? (
                        <ChevronDown size={11} strokeWidth={2} aria-hidden />
                      ) : null}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const pulse = pulses[row.original.id] ?? 0;
              const focused = focusedId === row.original.id;
              const selected = selectedId === row.original.id;
              const rowStyle = { "--i": Math.min(i, 6) } as CSSProperties;
              return (
                <tr
                  key={`${row.original.id}-${pulse}`}
                  data-id={row.original.id}
                  aria-selected={onSelect ? selected : undefined}
                  // Roving tabindex: exactamente una fila es tabbable —
                  // lectores de pantalla anuncian fila y aria-selected
                  tabIndex={
                    focused || (!focusedId && i === 0) ? 0 : -1
                  }
                  style={entered || pulse > 0 ? undefined : rowStyle}
                  className={cn(
                    "cursor-pointer border-b border-rule transition-colors duration-200 last:border-b-0 hover:bg-row-hover",
                    !entered && pulse === 0 && "animate-rise stagger",
                    pulse > 0 && "animate-pulse-row",
                    selected && "bg-row-selected",
                    // Foco de teclado: ring ámbar, nunca el fondo de selección
                    focused && "outline-2 -outline-offset-2 outline-amber",
                  )}
                  onClick={() => {
                    // El clic del ratón sustituye al foco de teclado:
                    // sin esto, la fila j/k previa queda "pegada"
                    if (focusedId !== row.original.id) setFocusedId(null);
                    openRow(row.original.id);
                  }}
                >
                  {row.getVisibleCells().map((cell, ci) => (
                    <td
                      key={cell.id}
                      role="gridcell"
                      className={cn(
                        "px-3 py-2.5",
                        HIDE_ON[cell.column.id],
                        // La barra ámbar de selección vive en la primera celda:
                        // box-shadow en <tr> no renderiza en table-row.
                        selected && ci === 0 && "shadow-[inset_4px_0_0_var(--color-amber-fill)]",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      </div>
    </div>
  );
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <table role="grid" aria-label="Cola de tickets" className="w-full border-collapse text-left">
      {children}
    </table>
  );
}
