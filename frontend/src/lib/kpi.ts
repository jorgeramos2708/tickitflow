import type { ApiMetric } from "./api";
import { slaOf } from "./sla";
import type { Ticket } from "./types";

/**
 * KPIs diarios agregados (ambas prácticas juntas), listos para sparkline
 * de 7 días + delta vs. la semana anterior.
 */
export interface KpiDay {
  day: string;
  /** Backlog abierto al cierre del día */
  open: number;
  /** Abiertos en riesgo o vencidos al cierre del día */
  atRisk: number;
  /** MTTR del día en minutos (-1 sin resueltos: sin datos) */
  mttr: number;
  /** Cumplimiento SLA del día 0–100 (-1 sin resueltos) */
  compliance: number;
}

/** Serie de los últimos `days` días (UTC), desde las filas del backend. */
export function metricsToDaily(rows: ApiMetric[], days = 14): KpiDay[] {
  const byDay = new Map<string, { open: number; atRisk: number; within: number; resolved: number; minutes: number }>();
  for (const r of rows) {
    const acc = byDay.get(r.day) ?? {
      open: 0, atRisk: 0, within: 0, resolved: 0, minutes: 0,
    };
    acc.open += r.openAtEnd;
    acc.atRisk += r.atRiskEnd;
    acc.within += r.withinSla;
    acc.resolved += r.resolved;
    acc.minutes += r.mttrMinutes * r.resolved;
    byDay.set(r.day, acc);
  }
  const out: KpiDay[] = [];
  const today = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(today - i * 86_400_000).toISOString().slice(0, 10);
    const a = byDay.get(key);
    out.push({
      day: key,
      open: a?.open ?? 0,
      atRisk: a?.atRisk ?? 0,
      mttr: a && a.resolved > 0 ? Math.round(a.minutes / a.resolved) : -1,
      compliance: a && a.resolved > 0 ? Math.round((a.within / a.resolved) * 100) : -1,
    });
  }
  return out;
}

/**
 * Derivación de la misma serie desde la cola local (modo demo o respaldo).
 * Misma matemática que MetricsService.recompute en el backend.
 */
export function deriveDaily(tickets: Ticket[], days = 14): KpiDay[] {
  const out: KpiDay[] = [];
  const today = Date.now();
  const terminalAt = (t: Ticket): number | null => {
    if (t.resolvedAt !== null) return t.resolvedAt;
    if (t.status === "cancelado") return t.updatedAt;
    return null;
  };
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = today - i * 86_400_000;
    const key = new Date(dayStart).toISOString().slice(0, 10);
    // "Cierre" del día: para hoy usa el reloj actual, para días pasados 24h
    const dayEnd =
      i === 0 ? today : dayStart + 86_400_000;
    const openRows = tickets.filter(
      (t) =>
        t.createdAt < dayEnd &&
        (terminalAt(t) === null || terminalAt(t)! >= dayEnd),
    );
    const resolvedRows = tickets.filter(
      (t) =>
        t.resolvedAt !== null &&
        t.resolvedAt >= dayStart &&
        t.resolvedAt < dayEnd,
    );
    const minutes =
      resolvedRows.length === 0
        ? 0
        : resolvedRows.reduce((acc, t) => acc + (t.resolvedAt! - t.createdAt), 0) /
          resolvedRows.length /
          60_000;
    const within = resolvedRows.filter(
      (t) => t.resolvedAt! - t.createdAt <= slaOf(t, dayEnd).targetMin * 60_000,
    ).length;
    out.push({
      day: key,
      open: openRows.length,
      atRisk: openRows.filter(
        (t) => dayEnd - t.createdAt >= 0.8 * slaOf(t, dayEnd).targetMin * 60_000,
      ).length,
      mttr:
        resolvedRows.length === 0
          ? -1
          : Math.round(minutes),
      compliance:
        resolvedRows.length === 0
          ? -1
          : Math.round((within / resolvedRows.length) * 100),
    });
  }
  return out;
}

export type DeltaKind = "count" | "duration" | "pct";

/**
 * EL helper de delta: compara la semana actual (7 días) con la anterior.
 * Devuelve texto listo ("▲ 14% vs. semana") o null si no hay datos.
 * - count: cambio porcentual de sumas
 * - duration: diferencia de promedios en horas ("▼ 6h vs. semana")
 * - pct: diferencia de promedios en puntos ("▲ 4 pp vs. semana")
 */
export function weeklyDelta(
  currentWeek: number[],
  previousWeek: number[],
  kind: DeltaKind,
): { text: string; up: boolean } | null {
  const valid = (xs: number[]) => xs.filter((x) => x >= 0);
  const cur = valid(currentWeek);
  const prev = valid(previousWeek);
  if (cur.length < 2) return null; // sin datos suficientes: ocultar
  const curSum = cur.reduce((a, b) => a + b, 0);
  const curAvg = curSum / cur.length;
  if (prev.length < 2) return null; // semana anterior vacía: nada que comparar
  const prevSum = prev.reduce((a, b) => a + b, 0);
  const prevAvg = prevSum / prev.length;

  const arrow = (up: boolean) => (up ? "▲" : "▼");
  if (kind === "count") {
    if (prevSum === 0) return null;
    const pct = Math.round(((curSum - prevSum) / prevSum) * 100);
    if (pct === 0) return null;
    const up = pct > 0;
    return { text: `${arrow(up)} ${Math.abs(pct)}% vs. semana`, up };
  }
  if (kind === "duration") {
    const diffH = Math.round((curAvg - prevAvg) / 60);
    if (diffH === 0) return null;
    const up = diffH > 0;
    return { text: `${arrow(up)} ${Math.abs(diffH)}h vs. semana`, up };
  }
  const diffPp = Math.round(curAvg - prevAvg);
  if (diffPp === 0) return null;
  const up = diffPp > 0;
  return { text: `${arrow(up)} ${Math.abs(diffPp)} pp vs. semana`, up };
}

/** Serie de un campo para el sparkline + delta (7 y 7 días previos). */
export function seriesOf(
  days: KpiDay[],
  key: "open" | "atRisk" | "mttr" | "compliance",
): { spark: number[]; prev: number[] } {
  const last14 = days.slice(-14);
  return {
    spark: last14.slice(-7).map((d) => d[key]),
    prev: last14.slice(0, 7).map((d) => d[key]),
  };
}
