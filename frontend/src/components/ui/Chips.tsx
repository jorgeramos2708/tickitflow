import { cn } from "../../lib/cn";
import {
  PRACTICE_BG,
  PRACTICE_LABEL,
  PRIORITY_LABEL,
  STATUS_CHIP,
  STATUS_DOT,
  STATUS_LABEL,
  type PracticeAll,
  type Priority,
  type TicketStatus,
} from "../../lib/types";

/** Badge de práctica: punto cuadrado en el matiz de la práctica, sin fondo de color. */
export function PracticeBadge({ practice }: { practice: PracticeAll }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
      <span aria-hidden className={cn("size-1.5 rounded-[2px]", PRACTICE_BG[practice])} />
      {PRACTICE_LABEL[practice]}
    </span>
  );
}

/** Chip de prioridad semáforo: P1 rojo · P2 naranja · P3 amarillo · P4 verde. */
const PRIORITY_SKIN: Record<Priority, string> = {
  P1: "bg-p1 text-p1-ink",
  P2: "bg-p2 text-p2-ink",
  P3: "bg-p3 text-p3-ink",
  P4: "bg-p4 text-p4-ink",
};

export function PriorityChip({
  priority,
  full = false,
  className,
}: {
  priority: Priority;
  full?: boolean;
  className?: string;
}) {
  const label = full ? PRIORITY_LABEL[priority] : priority;
  return (
    <span
      title={PRIORITY_LABEL[priority]}
      className={cn(
        "inline-flex w-fit items-center justify-center rounded-lg px-2 py-[3px] font-display text-[12px] font-extrabold tabular-nums",
        PRIORITY_SKIN[priority],
        full && "px-2.5",
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Estado: chip pintado del color que lo representa (dot + texto). */
export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[12px] font-semibold",
        STATUS_CHIP[status],
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-[2px]", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}
