import { useId } from "react";
import { cn } from "../lib/cn";

/**
 * Marca TickITFlow vectorial: tile ámbar con muesca + línea de pulso.
 * SVG inline — escala perfecta a cualquier tamaño sin pixelación.
 * La línea de pulso usa currentColor (ink del tema activo).
 */
export function LogoMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const maskId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="TickITFlow"
    >
      <defs>
        <mask id={maskId}>
          <rect x="-4" y="-4" width="72" height="72" fill="black" />
          <rect x="0" y="0" width="64" height="64" rx="12" fill="white" />
          <circle cx="64" cy="32" r="8" fill="black" />
        </mask>
      </defs>
      <rect x="0" y="0" width="64" height="64" rx="12" fill="var(--color-amber-fill)" mask={`url(#${maskId})`} />
      <path
        d="M14 32 H26 L32 42 L46 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Lockup completo: marca + "TickITFlow" en Nunito 800.
 * El texto es SVG (no DOM) para escalar proporcionalmente.
 */
export function LogoLockup({
  size = 40,
  showText = true,
  className,
}: {
  size?: number;
  showText?: boolean;
  className?: string;
}) {
  if (!showText) {
    return <LogoMark size={size} className={className} />;
  }
  return (
    <span className={cn("flex items-center", className)}>
      <LogoMark size={size} />
      <span
        className="font-display text-[0.62em] leading-none font-extrabold tracking-tight whitespace-nowrap text-ink"
        style={{ fontSize: size * 0.62 }}
      >
        Tick
        <span
          className="mx-[0.05em] inline-flex -translate-y-[0.03em] items-center rounded-md bg-amber-fill px-[0.18em] py-[0.1em] leading-none text-amber-fill-ink"
        >
          IT
        </span>
        Flow
      </span>
    </span>
  );
}
