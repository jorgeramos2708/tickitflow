import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { LogoLockup, LogoMark } from "../brand/Logo";
import { Button } from "../components/ui/Button";

const PRACTICES: Array<[string, string]> = [
  ["Incidentes", "Algo se rompió: se registra, se prioriza por la matriz ITIL y se resuelve contra un objetivo de SLA visible."],
  ["Requerimientos", "El catálogo de autoservicio lo recibe ya clasificado, con estimación de atención y sin llamadas."],
  ["Problemas", "Los incidentes recurrentes suben a un registro de problema con causa raíz documentada."],
  ["Cambios", "Flujo CAB con aprobación por rol: normal, estándar pre-aprobado y emergencia documentada."],
  ["CMDB", "Elementos de configuración con relaciones tipadas y tickets ligados — el mapa completo del parque."],
  ["Base de conocimiento", "Cada solución documentada queda disponible para agentes y usuarios finales."],
];

const STEPS: Array<[string, string, string]> = [
  ["1", "Registra", "El usuario reporta desde el portal o el agente lo levanta en la consola."],
  ["2", "Prioriza", "La matriz de impacto × urgencia asigna P1–P4 y arranca el reloj de SLA."],
  ["3", "Resuelve", "La cola crítica ordena el trabajo; cada avance queda en la bitácora y el bus de eventos avisa al resto."],
];

export function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-5 md:px-8">
          <LogoLockup />
          <nav aria-label="Accesos" className="flex items-center gap-2">
            <Link to="/portal">
              <Button variant="ghost" size="sm" className="h-9">
                Portal de autoservicio
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="h-9">
                Entrar
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 md:px-8">
        {/* Portada: la sala de guardia como póster */}
        <section className="pt-16 pb-14 md:pt-24 md:pb-20">
          <div className="h-2 w-24 rounded-full bg-amber-fill" aria-hidden />
          <h1 className="mt-8 max-w-[16ch] font-display text-[44px] leading-[1.05] font-extrabold tracking-[-0.01em] text-ink md:text-[72px]">
            La mesa de servicio ITIL con la cola siempre a la vista.
          </h1>
          <p className="mt-6 max-w-[54ch] text-[16px] leading-relaxed text-ink-2 md:text-[18px]">
            TickITFlow es la consola de agentes y el portal de autoservicio para
            el soporte de TI: prácticas ITIL completas, prioridad calculada por
            matriz de impacto × urgencia y SLA visible en cada fila — con un
            panel de detalle que no te saca de la cola.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/portal">
              <Button variant="primary" className="h-11 px-6 text-[15px]">
                Probar la demo
                <ArrowRight size={15} strokeWidth={2} aria-hidden />
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="h-11 px-6 text-[15px]">
                Soy agente de soporte
              </Button>
            </Link>
          </div>
          <p className="mt-4 font-mono text-[11.5px] text-ink-3">
            Demostración completa con datos sintéticos · cuenta: agente@tickitflow.dev · demo1234
          </p>

          <div className="mt-14 flex items-end justify-between gap-8">
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
              {STEPS.map(([n, title, body]) => (
                <div key={n} className="border-t-2 border-rule pt-4">
                  <p className="font-mono text-[12px] tabular-nums text-ink-3">
                    {n}
                  </p>
                  <p className="mt-1.5 font-display text-[15px] font-bold text-ink">
                    {title}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                    {body}
                  </p>
                </div>
              ))}
            </div>
            <LogoMark
              size={168}
              className="hidden shrink-0 text-ink lg:block"
            />
          </div>
        </section>

        {/* Prácticas: la tabla de la guardia, no tarjetas */}
        <section className="border-t border-rule py-14" aria-label="Prácticas ITIL">
          <h2 className="font-display text-[30px] leading-[1.2] font-extrabold tracking-tight">
            Las seis prácticas, sin cajas de bonus
          </h2>
          <p className="mt-2 max-w-[60ch] text-[14.5px] text-ink-3">
            Todo lo que la consola y el portal hacen, en una sola tabla — el
            tablero completo del turno.
          </p>
          <ul className="mt-8 border-t border-rule">
            {PRACTICES.map(([name, body], i) => (
              <li
                key={name}
                className="grid grid-cols-1 items-baseline gap-x-8 gap-y-2 border-b border-rule py-4 md:grid-cols-[220px_1fr]"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-[11.5px] tabular-nums text-ink-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-display text-[16px] font-bold text-ink">
                    {name}
                  </span>
                </div>
                <p className="max-w-[70ch] text-[13.5px] leading-relaxed text-ink-2">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Arquitectura honesta */}
        <section className="border-t border-rule py-14" aria-label="Arquitectura">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div>
              <h2 className="font-display text-[30px] leading-[1.2] font-extrabold tracking-tight">
                Microservicios, de verdad
              </h2>
              <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-2">
                Cada dominio corre en su propio servicio NestJS con su base
                PostgreSQL dedicada — incidentes y requerimientos comparten el
                servicio de tickets —, detrás de un gateway y un bus RabbitMQ
                que publica cada evento: lo que ves en la consola es lo que
                consume el notification-service, en vivo.
              </p>
            </div>
            <div>
              <h2 className="font-display text-[30px] leading-[1.2] font-extrabold tracking-tight">
                Modo dual, sin engaños
              </h2>
              <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-2">
                Sin backend, la demo corre con datos sintéticos y lo declara.
                Con el stack levantado, todo viene de los microservicios y el
                chip lo dice: nunca se presenta un dato como real sin serlo.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
