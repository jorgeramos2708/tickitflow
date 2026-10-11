import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export type Practice = "incidente" | "requerimiento";
/**
 * Workflow de tickets:
 *  nuevo → asignado → en_progreso ⇄ pendiente_usuario → resuelto → cerrado
 *  nuevo/asignado/en_progreso/pendiente_usuario → cancelado (terminal)
 *  resuelto → en_progreso (reapertura por respuesta del usuario)
 *  cerrado y cancelado son terminales: jamás se modifican; una respuesta
 *  del usuario genera un ticket nuevo vinculado (Re: CODE — asunto).
 */
export type TicketStatus =
  | "nuevo"
  | "asignado"
  | "en_progreso"
  | "pendiente_usuario"
  | "resuelto"
  | "cerrado"
  | "cancelado";
export type Priority = "P1" | "P2" | "P3" | "P4";

@Entity("tickets")
@Index(["practice", "status"])
export class TicketEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  code!: string;

  @Column()
  practice!: Practice;

  @Column()
  subject!: string;

  @Column()
  description!: string;

  @Column()
  requester!: string;

  @Column()
  dept!: string;

  @Column()
  priority!: Priority;

  @Column()
  status!: TicketStatus;

  @Column({ type: "varchar", nullable: true })
  assignee!: string | null;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;

  @Column({ type: "timestamptz", name: "updated_at" })
  updatedAt!: Date;

  @Column({ type: "timestamptz", name: "resolved_at", nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: "jsonb", nullable: true })
  attachments!: Array<{ name: string; sizeKb: number }> | null;
}

@Entity("ticket_events")
@Index("idx_events_ticket", ["ticketId"])
export class TicketEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "ticket_id" })
  ticketId!: number;

  @Column({ type: "timestamptz" })
  at!: Date;

  @Column()
  kind!: string;

  @Column()
  actor!: string;

  @Column({ type: "text", nullable: true })
  detail!: string | null;

  @Column({ type: "varchar", nullable: true })
  from!: string | null;

  @Column({ type: "varchar", nullable: true })
  to!: string | null;
}
