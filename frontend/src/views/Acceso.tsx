import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Field, TextInput } from "../components/ui/Field";
import { LogoMark } from "../brand/Logo";
import { useAuth } from "../lib/auth";

export function Acceso() {
  const { login } = useAuth();
  const [email, setEmail] = useState("agente@tickitflow.dev");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(false);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="w-full max-w-sm animate-rise">
        <div className="flex flex-col items-center gap-3">
          <LogoMark size={88} className="text-ink animate-logo" />
          <p
            className="font-display text-[36px] leading-none font-extrabold tracking-tight text-ink"
            style={{ animation: "rise 450ms cubic-bezier(.2,.8,.2,1) 200ms both" }}
          >
            Tick
            <span className="mx-[2px] inline-flex -translate-y-[2px] items-center rounded-lg bg-amber-fill px-[6px] py-[4px] leading-none text-amber-fill-ink">
              IT
            </span>
            Flow
          </p>
        </div>
        <div className="mt-6 rounded-xl border border-rule bg-raised px-6 py-6">
          <h1 className="font-display text-[20px] leading-tight font-extrabold tracking-tight">
            Acceso a TickITFlow
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Consola de agentes y portal de autoservicio con una misma cuenta.
          </p>
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Field label="Correo" htmlFor="login-email">
              <TextInput
                id="login-email"
                type="email"
                value={email}
                autoComplete="username"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Contraseña" htmlFor="login-pass">
              <TextInput
                id="login-pass"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo1234"
                required
              />
            </Field>
            {error ? (
              <p role="alert" className="text-[13px] text-signal">
                Credenciales no válidas — verifica el correo y la contraseña.
              </p>
            ) : null}
            <Button variant="primary" type="submit" disabled={busy} className="w-full">
              {busy ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </div>
        <p className="mt-3 text-center text-[12.5px] text-ink-3">
          ¿Primera vez?{" "}
          <Link
            to="/landing"
            className="link-grow hover:link-grow-hover font-bold text-amber hover:text-amber-hi"
          >
            Mira la presentación
          </Link>
        </p>
      </div>
    </div>
  );
}
