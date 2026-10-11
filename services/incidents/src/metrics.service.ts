import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TicketEntity, type Practice, type Priority } from "./ticket.entity";
import {
  DailyMetricEntity,
  metricToDto,
  type MetricDto,
} from "./daily-metric.entity";

const SLA_TARGET_MIN: Record<Priority, number> = {
  P1: 240,
  P2: 480,
  P3: 1440,
  P4: 2880,
};

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function startOfDayUtc(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Momento en que un ticket dejó de estar abierto. Resuelto → resolvedAt;
 * cancelado (sin resolvedAt) → updatedAt como aproximación del cierre.
 */
function terminalAt(t: TicketEntity): number | null {
  if (t.resolvedAt !== null) return t.resolvedAt.getTime();
  if (t.status === "cancelado") return t.updatedAt.getTime();
  return null;
}

/**
 * Series históricas: métricas diarias por práctica, derivadas de los tickets
 * y persistidas en daily_metrics. El recompute es idempotente (upsert), así
 * que el backfill de los últimos N días es seguro en cada arranque.
 */
@Injectable()
export class MetricsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly tickets: Repository<TicketEntity>,
    @InjectRepository(DailyMetricEntity)
    private readonly metrics: Repository<DailyMetricEntity>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.recompute(30);
      console.log("[incidents-service] métricas diarias recalculadas (30 días)");
    } catch (err) {
      console.error("[incidents-service] recompute de métricas falló:", (err as Error).message);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async nightly(): Promise<void> {
    await this.recompute(30);
  }

  async recompute(days: number): Promise<void> {
    const rows = await this.tickets.find();
    const today = startOfDayUtc(Date.now());
    for (const practice of ["incidente", "requerimiento"] as Practice[]) {
      for (let i = days - 1; i >= 0; i--) {
        const dayStart = today - i * 86_400_000;
        const dayEnd = dayStart + 86_400_000;
        const key = dayKey(dayStart);
        const created = rows.filter(
          (t) =>
            t.practice === practice &&
            t.createdAt.getTime() >= dayStart &&
            t.createdAt.getTime() < dayEnd,
        ).length;
        const resolvedRows = rows.filter(
          (t) =>
            t.practice === practice &&
            t.resolvedAt !== null &&
            t.resolvedAt.getTime() >= dayStart &&
            t.resolvedAt.getTime() < dayEnd,
        );
        const resolved = resolvedRows.length;
        const mttrMinutes =
          resolved === 0
            ? 0
            : Math.round(
                resolvedRows.reduce(
                  (acc, t) => acc + (t.resolvedAt!.getTime() - t.createdAt.getTime()),
                  0,
                ) /
                  resolved /
                  60_000,
              );
        const withinSla = resolvedRows.filter(
          (t) =>
            t.resolvedAt!.getTime() - t.createdAt.getTime() <=
            SLA_TARGET_MIN[t.priority] * 60_000,
        ).length;
        // Backlog abierto al cierre del día y cuánto estaba en riesgo de SLA
        const openRows = rows.filter(
          (t) =>
            t.practice === practice &&
            t.createdAt.getTime() < dayEnd &&
            (terminalAt(t) === null || terminalAt(t)! >= dayEnd),
        );
        const atRiskEnd = openRows.filter(
          (t) =>
            dayEnd - t.createdAt.getTime() >=
            0.8 * SLA_TARGET_MIN[t.priority] * 60_000,
        ).length;
        await this.metrics.upsert(
          {
            day: key,
            practice,
            created,
            resolved,
            mttrMinutes,
            withinSla,
            openAtEnd: openRows.length,
            atRiskEnd,
          },
          ["day", "practice"],
        );
      }
    }
  }

  async daily(days = 30): Promise<MetricDto[]> {
    const rows = await this.metrics.find({
      order: { day: "ASC" as const },
    });
    const cutoff = dayKey(startOfDayUtc(Date.now()) - (days - 1) * 86_400_000);
    return rows.filter((m) => m.day >= cutoff).map(metricToDto);
  }
}
