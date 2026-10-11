import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { weekChartStats } from "../../lib/kpi";

/** Día completo a partir de la etiqueta corta (dom, lun, mié…). */
const FULL_DAY: Record<string, string> = {
  dom: "Domingo",
  lun: "Lunes",
  mar: "Martes",
  "mié": "Miércoles",
  jue: "Jueves",
  vie: "Viernes",
  "sáb": "Sábado",
};

/** Capitaliza la etiqueta corta: "dom" → "Dom", "mié" → "Mié" */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface WeekDatum {
  day: string;
  count: number;
}

/** Ancho del margen derecho para la etiqueta "prom." */
const PROM_MARGIN = 44;
/** Ancho mínimo de tarjeta para mostrar la etiqueta dentro de la gráfica */
const MIN_WIDTH_FOR_INLINE_PROM = 320;
/**
 * Gráfica semanal (Lun–Dom) con jerarquía: pico resaltado, ceros como
 * línea fina, línea de promedio punteada en margen propio, tooltip
 * accesible y resumen en aria-label. HTML/CSS flex — sin librerías.
 */
export function WeekChart({
  data,
  todayIndex,
  footerTotal,
}: {
  data: WeekDatum[];
  /** Índice del día actual (negrita + punto 4px, no color de barra) */
  todayIndex?: number;
  /** Callback: el pie recibe el total, el promedio y si la etiqueta "prom." va inline */
  footerTotal?: (total: number, avg: number, allZero: boolean, promInline: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(400);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setContainerW(e.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const values = data.map((d) => d.count);
  const { total, max, avg, peakIndexes } = weekChartStats(values);
  const allZero = total === 0;
  const peakDay =
    peakIndexes.length > 0
      ? (FULL_DAY[data[peakIndexes[0]].day.toLowerCase()] ?? data[peakIndexes[0]].day)
      : null;
  const aria = allZero
    ? "Sin registros esta semana"
    : `${total} registros en 7 días, pico el ${peakDay?.toLowerCase()} con ${max}, promedio ${avg.toFixed(1)}`;

  // Área de barras: 100px de alto, el máximo ocupa 80px
  const barH = (v: number) => (max > 0 ? (v / max) * 80 : 0);
  const avgH = barH(Math.min(avg, max));

  const showInlineProm = !allZero && containerW >= MIN_WIDTH_FOR_INLINE_PROM;

  // Notificar al pie (para tarjetas angostas)
  useEffect(() => {
    if (footerTotal) footerTotal(total, avg, allZero, showInlineProm);
  }, [footerTotal, total, avg, allZero, showInlineProm]);

  return (
    <div ref={containerRef} className="relative mt-2" role="img" aria-label={aria}>
      <div className="flex items-end gap-1.5" style={{ paddingRight: showInlineProm ? PROM_MARGIN : 0 }}>
        {data.map((d, i) => {
          const v = d.count;
          const isPeak = peakIndexes.includes(i);
          const full = FULL_DAY[d.day.toLowerCase()] ?? d.day;
          const isToday = todayIndex === i;
          return (
            <div
              key={`${d.day}-${i}`}
              role="img"
              tabIndex={0}
              aria-label={`${full}: ${v} ${v === 1 ? "registro" : "registros"}`}
              className="group relative h-[132px] flex-1 cursor-default rounded-md outline-offset-[-2px]"
            >
              {/* Valor numérico: pegado al tope de la barra */}
              <span
                className={cn(
                  "pointer-events-none absolute inset-x-0 text-center font-mono text-[10.5px] tabular-nums",
                  isPeak
                    ? "font-medium text-ink"
                    : v === 0
                      ? "text-ink-3"
                      : "text-ink-2",
                )}
                style={{ bottom: 21 + (v > 0 ? barH(v) : 2) }}
              >
                {v}
              </span>

              {/* Zona de barras (100px): barra o línea de vacío; max 32px */}
              <div className="absolute inset-x-0 bottom-[18px] flex h-[100px] items-end justify-center">
                {v > 0 ? (
                  <div
                    className={cn(
                      "max-w-[32px] w-[60%] rounded-t-[3px]",
                      isPeak ? "bg-amber-fill" : "bg-amber-fill/55",
                    )}
                    style={{ height: barH(v) }}
                  />
                ) : (
                  <div className="max-w-[32px] w-[60%] h-[2px] bg-rule-2" />
                )}
              </div>

              {/* Etiqueta del día: hoy en negrita + punto 4px debajo */}
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 text-center text-[10px]",
                  isToday ? "font-bold text-ink-2" : "text-ink-3",
                )}
              >
                {cap(d.day)}
              </span>
              {isToday ? (
                <span
                  aria-hidden
                  className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 rounded-full bg-amber-fill"
                  style={{ width: 4, height: 4 }}
                />
              ) : null}

              {/* Tooltip: hover, teclado y táctil */}
              <span className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-rule bg-raised px-2 py-1 text-[11px] whitespace-nowrap text-ink-2 opacity-0 shadow-3 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                {full}: {v} {v === 1 ? "registro" : "registros"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Línea base de 0.5px bajo las barras (termina antes del margen) */}
      <div
        aria-hidden
        className="absolute bottom-[18px] left-0 bg-rule-2"
        style={{ height: "0.5px", right: showInlineProm ? PROM_MARGIN : 0 }}
      />

      {/* Promedio: línea punteada en el área de barras + etiqueta en el margen derecho */}
      {!allZero ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 border-t border-dotted border-rule-2"
            style={{
              bottom: 18 + avgH,
              right: showInlineProm ? PROM_MARGIN : 0,
            }}
          />
          {showInlineProm ? (
            <span
              aria-hidden
              className="pointer-events-none absolute right-0 text-[10px] font-mono tabular-nums text-ink-3"
              style={{ bottom: 18 + avgH - 5 }}
            >
              prom. {avg.toFixed(1)}
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
