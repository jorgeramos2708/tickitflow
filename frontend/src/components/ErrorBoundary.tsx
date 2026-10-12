import { Component, type ErrorInfo, type ReactNode } from "react";
import { LogoMark } from "../brand/Logo";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Límite de error global: si React crashea, el usuario ve recuperación, no pantalla blanca. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[error-boundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-paper px-5">
          <div className="w-full max-w-md animate-rise">
            <div className="flex justify-center">
              <LogoMark size={40} className="text-ink" />
            </div>
            <div className="mt-6 rounded-xl border border-rule bg-raised px-6 py-6 text-center">
              <h1 className="font-display text-[20px] leading-tight font-extrabold tracking-tight">
                Algo se rompió en la interfaz
              </h1>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
                La consola encontró un error inesperado. Tus datos están
                seguros — el backend sigue funcionando. Puedes recargar o
                volver al inicio.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.location.assign("/")}
                  className="h-9 cursor-pointer rounded-xl bg-amber-fill px-4 text-sm font-bold text-amber-fill-ink transition-all duration-200 hover:-translate-y-0.5 hover:shadow-glow"
                >
                  Volver al inicio
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="h-9 cursor-pointer rounded-xl border border-rule-2 bg-raised px-4 text-sm font-bold text-ink transition-colors duration-150 hover:border-amber"
                >
                  Recargar
                </button>
              </div>
              {this.state.error ? (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-[12px] text-ink-3">
                    Detalle técnico
                  </summary>
                  <pre className="mt-2 max-h-32 overflow-auto rounded-xl border border-rule bg-paper px-3 py-2 font-mono text-[11px] text-ink-2">
                    {this.state.error.message}
                  </pre>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
