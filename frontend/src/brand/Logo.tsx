import { cn } from "../lib/cn";
import logoDia from "../assets/brand/tickitflow-dia.png";
import logoNoche from "../assets/brand/tickitflow-noche.png";

const ASPECT = 217 / 165;

/**
 * Logo TickITFlow (arte del usuario, recolorizado a la paleta del sistema:
 * cian -> ambar, blanco -> tinta del tema, fondo transparente).
 * Dos variantes dia/noche intercambiadas por CSS ([data-theme]).
 */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size * ASPECT, height: size }}
    >
      <img
        src={logoDia}
        alt=""
        className="logo-variant-dia absolute inset-0 h-full w-full"
      />
      <img
        src={logoNoche}
        alt=""
        className="logo-variant-noche absolute inset-0 h-full w-full"
      />
    </span>
  );
}

export function LogoLockup({
  size = 45,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center", className)}>
      <LogoMark size={size} />
      <span className="sr-only">TickITFlow</span>
    </span>
  );
}
