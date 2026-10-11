export type Practice = "incidente" | "requerimiento";
export type PracticeAll = Practice | "problema" | "cambio";
export type Priority = "P1" | "P2" | "P3" | "P4";
export type Impact = "alto" | "medio" | "bajo";
export type Urgency = "alta" | "media" | "baja";
export type TicketStatus =
  | "nuevo"
  | "asignado"
  | "en_progreso"
  | "pendiente_usuario"
  | "resuelto"
  | "cerrado"
  | "cancelado";
export type SlaLevel = "ok" | "warn" | "breach";

export type EventKind =
  | "creado"
  | "estado"
  | "nota"
  | "asignacion"
  | "prioridad"
  | "adjunto";

export interface TicketEvent {
  id: string;
  at: number;
  kind: EventKind;
  actor: string;
  detail?: string;
  from?: string;
  to?: string;
}

export interface Attachment {
  name: string;
  sizeKb: number;
}

export interface Ticket {
  id: string;
  practice: Practice;
  subject: string;
  description: string;
  requester: string;
  dept: string;
  priority: Priority;
  status: TicketStatus;
  assignee: string | null;
  createdAt: number;
  updatedAt: number;
  resolvedAt: number | null;
  events: TicketEvent[];
  attachments: Attachment[];
}

export const PRACTICE_LABEL: Record<PracticeAll, string> = {
  incidente: "Incidente",
  requerimiento: "Requerimiento",
  problema: "Problema",
  cambio: "Cambio",
};

export const PRACTICE_PREFIX: Record<Practice, string> = {
  incidente: "INC",
  requerimiento: "REQ",
};

export const PRACTICE_TEXT: Record<PracticeAll, string> = {
  incidente: "text-signal",
  requerimiento: "text-cobalt",
  problema: "text-amber",
  cambio: "text-violet",
};

export const PRACTICE_BG: Record<PracticeAll, string> = {
  incidente: "bg-signal",
  requerimiento: "bg-cobalt",
  problema: "bg-amber",
  cambio: "bg-violet",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  nuevo: "Nuevo",
  asignado: "Asignado",
  en_progreso: "En progreso",
  pendiente_usuario: "En espera",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  cancelado: "Cancelado",
};

export const STATUS_DOT: Record<TicketStatus, string> = {
  nuevo: "bg-status-nuevo",
  asignado: "bg-status-asignado",
  en_progreso: "bg-status-progreso",
  pendiente_usuario: "bg-status-espera",
  resuelto: "bg-status-resuelto",
  cerrado: "bg-status-cerrado",
  cancelado: "bg-rule-2",
};

/** Chip pintado del estado: fondo tenue + texto + borde del color. */
export const STATUS_CHIP: Record<TicketStatus, string> = {
  nuevo:
    "border-status-nuevo/30 bg-status-nuevo/10 text-status-nuevo",
  asignado:
    "border-status-asignado/30 bg-status-asignado/10 text-status-asignado",
  en_progreso:
    "border-status-progreso/30 bg-status-progreso/10 text-status-progreso",
  pendiente_usuario:
    "border-status-espera/35 bg-status-espera/10 text-status-espera",
  resuelto:
    "border-status-resuelto/30 bg-status-resuelto/10 text-status-resuelto",
  // Cerrado: gris oscuro/neutro — sobrio, terminal
  cerrado:
    "border-status-cerrado/30 bg-status-cerrado/10 text-status-cerrado",
  // Cancelado: gris claro con borde gris (blanco en claro, chip en noche)
  cancelado: "border-rule-2 bg-raised text-ink-3",
};

export const OPEN_STATUSES: TicketStatus[] = [
  "nuevo",
  "asignado",
  "en_progreso",
  "pendiente_usuario",
];

/** Estados terminales: jamás se modifican ni reabren. */
export const TERMINAL_STATUSES: TicketStatus[] = ["cerrado", "cancelado"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  P1: "P1 · Crítico",
  P2: "P2 · Alto",
  P3: "P3 · Medio",
  P4: "P4 · Bajo",
};

export const IMPACT_LABEL: Record<Impact, string> = {
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

/* ─── Gestión de Problemas ─── */

export type ProblemStatus = "nuevo" | "investigacion" | "resuelto" | "cerrado";

export interface Problem {
  id: string;
  title: string;
  description: string;
  status: ProblemStatus;
  causeRaiz: string | null;
  workaround: boolean;
  linkedIncidentIds: string[];
  assignee: string | null;
  createdAt: number;
  updatedAt: number;
}

export const PROBLEM_STATUS_LABEL: Record<ProblemStatus, string> = {
  nuevo: "Nuevo",
  investigacion: "En investigación",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const PROBLEM_STATUS_DOT: Record<ProblemStatus, string> = {
  nuevo: "bg-ink",
  investigacion: "bg-ink/50",
  resuelto: "bg-good",
  cerrado: "bg-rule-2",
};

/* ─── Gestión de Cambios ─── */

export type ChangeType = "normal" | "estandar" | "emergencia";
export type ChangeStatus =
  | "borrador"
  | "en_revision"
  | "aprobado"
  | "rechazado"
  | "implementado"
  | "cerrado";
export type ChangeRisk = "bajo" | "medio" | "alto";
export type ApprovalState = "pendiente" | "aprobado" | "rechazado";

export interface ChangeApproval {
  role: string;
  state: ApprovalState;
}

export interface Change {
  id: string;
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
  createdAt: number;
  updatedAt: number;
}

export const CHANGE_TYPE_LABEL: Record<ChangeType, string> = {
  normal: "Normal",
  estandar: "Estándar",
  emergencia: "Emergencia",
};

export const CHANGE_TYPE_SKIN: Record<ChangeType, string> = {
  normal: "bg-ink text-paper font-semibold",
  estandar: "border border-rule-2 text-ink-2 font-medium",
  emergencia: "border border-amber text-amber font-semibold",
};

export const CHANGE_STATUS_LABEL: Record<ChangeStatus, string> = {
  borrador: "Borrador",
  en_revision: "En revisión CAB",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  implementado: "Implementado",
  cerrado: "Cerrado",
};

export const CHANGE_STATUS_DOT: Record<ChangeStatus, string> = {
  borrador: "bg-ink/50",
  en_revision: "bg-amber",
  aprobado: "bg-good",
  rechazado: "bg-signal",
  implementado: "bg-ink",
  cerrado: "bg-rule-2",
};

export const CHANGE_RISK_LABEL: Record<ChangeRisk, string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
};

export const APPROVAL_STATE_LABEL: Record<ApprovalState, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

/** Flujo de aprobación ITIL según el tipo de cambio (espejo del servidor). */
export function approvalsForChangeType(type: ChangeType): ChangeApproval[] {
  if (type === "estandar") {
    return [
      { role: "Gestor de cambios", state: "aprobado" },
      { role: "Implementación", state: "aprobado" },
    ];
  }
  if (type === "emergencia") {
    return [
      { role: "ECAB — Dirección de TI", state: "pendiente" },
      { role: "Implementación", state: "pendiente" },
    ];
  }
  return [
    { role: "Gestor de cambios", state: "pendiente" },
    { role: "CAB — Líder de infraestructura", state: "pendiente" },
    { role: "Implementación", state: "pendiente" },
  ];
}

export const APPROVAL_DOT: Record<ApprovalState, string> = {
  pendiente: "bg-rule-2",
  aprobado: "bg-good",
  rechazado: "bg-signal",
};

/* ─── CMDB: elementos de configuración ─── */

export type CiType =
  | "servidor"
  | "aplicacion"
  | "estacion"
  | "impresora"
  | "servicio"
  | "red";

export type CiEnvironment = "produccion" | "pruebas" | "desarrollo";
export type CiCriticality = "alta" | "media" | "baja";
export type RelationKind =
  | "se_ejecuta_en"
  | "conecta_a"
  | "depende_de"
  | "parte_de";

export interface CiRelation {
  ciId: string;
  kind: RelationKind;
}

export interface ConfigItem {
  id: string;
  name: string;
  type: CiType;
  environment: CiEnvironment;
  criticality: CiCriticality;
  owner: string;
  relations: CiRelation[];
}

export const CI_TYPE_LABEL: Record<CiType, string> = {
  servidor: "Servidor",
  aplicacion: "Aplicación",
  estacion: "Estación",
  impresora: "Impresora",
  servicio: "Servicio",
  red: "Red",
};

export const CI_ENV_LABEL: Record<CiEnvironment, string> = {
  produccion: "Producción",
  pruebas: "Pruebas",
  desarrollo: "Desarrollo",
};

export const CI_CRIT_LABEL: Record<CiCriticality, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export const RELATION_LABEL: Record<RelationKind, string> = {
  se_ejecuta_en: "se ejecuta en",
  conecta_a: "conecta a",
  depende_de: "depende de",
  parte_de: "es parte de",
};

/* ─── Base de conocimiento ─── */

export interface KbSection {
  heading: string;
  body: string;
}

export interface KbArticle {
  id: string;
  title: string;
  practice: PracticeAll;
  summary: string;
  sections: KbSection[];
  views: number;
  helpful: number;
  updatedAt: number;
}
