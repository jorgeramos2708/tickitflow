import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";
import type { Practice } from "./ticket.entity";

@Entity("daily_metrics")
@Unique("UQ_day_practice", ["day", "practice"])
export class DailyMetricEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  /** Día en formato YYYY-MM-DD (zona UTC). */
  @Column({ type: "date" })
  day!: string;

  @Column()
  practice!: Practice;

  @Column()
  created!: number;

  @Column()
  resolved!: number;

  @Column({ name: "mttr_minutes", type: "integer" })
  mttrMinutes!: number;

  @Column({ name: "within_sla", type: "integer" })
  withinSla!: number;

  /** Backlog abierto al cierre del día (KPI "Abiertos"). */
  @Column({ name: "open_at_end", type: "integer" })
  openAtEnd!: number;

  /** Abiertos en riesgo o vencidos de SLA al cierre del día (KPI "En riesgo"). */
  @Column({ name: "at_risk_end", type: "integer" })
  atRiskEnd!: number;
}

export interface MetricDto {
  day: string;
  practice: Practice;
  created: number;
  resolved: number;
  mttrMinutes: number;
  withinSla: number;
  openAtEnd: number;
  atRiskEnd: number;
}

export function metricToDto(m: DailyMetricEntity): MetricDto {
  return {
    day: typeof m.day === "string" ? m.day : String(m.day),
    practice: m.practice,
    created: m.created,
    resolved: m.resolved,
    mttrMinutes: m.mttrMinutes,
    withinSla: m.withinSla,
    openAtEnd: m.openAtEnd,
    atRiskEnd: m.atRiskEnd,
  };
}
