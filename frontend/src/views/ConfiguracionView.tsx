import { useEffect, useState } from "react";
import { Save, Send, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Field, Segmented, Select, TextInput } from "../components/ui/Field";
import { Module } from "../components/ui/Module";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

interface SmtpState {
  host: string;
  port: string;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
  enabled: boolean;
  recipients: string;
}

const EMPTY: SmtpState = {
  host: "",
  port: "587",
  user: "",
  pass: "",
  from: "tickitflow@edrs.xyz",
  secure: false,
  enabled: false,
  recipients: "",
};

const ROLES = ["admin", "supervisor", "agente", "usuario"] as const;

const ROLE_STYLE: Record<string, string> = {
  admin: "border-amber-fill/40 bg-amber-fill/10 text-amber",
  supervisor: "border-status-progreso/30 bg-status-progreso/10 text-status-progreso",
  agente: "border-status-asignado/30 bg-status-asignado/10 text-status-asignado",
  usuario: "border-rule-2 bg-raised text-ink-3",
};

function RoleChip({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11.5px] font-semibold ${ROLE_STYLE[role] ?? ROLE_STYLE.usuario}`}
    >
      {role}
    </span>
  );
}

export function ConfiguracionView() {
  const { token, user } = useAuth();
  const role = user?.role ?? "";
  const isAdmin = role === "admin";
  const canSeeUsers = isAdmin || role === "supervisor";

  const [smtp, setSmtp] = useState<SmtpState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [passUnreadable, setPassUnreadable] = useState(false);

  // ── Usuarios (RBAC) ──
  const [users, setUsers] = useState<
    { email: string; name: string; role: string }[]
  >([]);
  const [usersMsg, setUsersMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<string>("agente");
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "agente",
    password: "",
  });

  useEffect(() => {
    if (!token) return;
    if (isAdmin) {
      api
        .getSmtpSettings(token)
        .then((res) => {
          setPassUnreadable(res.smtp.passStatus === "unreadable");
          setSmtp({
            host: res.smtp.host,
            port: String(res.smtp.port),
            user: res.smtp.user,
            pass: res.smtp.pass ?? "",
            from: res.smtp.from,
            secure: res.smtp.secure,
            enabled: res.smtp.enabled,
            recipients: res.smtp.recipients.join(", "),
          });
        })
        .catch((err) => console.error("[settings]", err));
    }
  }, [token, isAdmin]);

  const loadUsers = () => {
    if (!token || !canSeeUsers) return;
    setUsersMsg(null);
    api
      .listUsers(token)
      .then((rows) => setUsers(rows))
      .catch(() => setUsersMsg("No se pudo cargar el directorio de usuarios"));
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canSeeUsers]);

  if (!canSeeUsers && !isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-rule bg-raised px-6 py-10 text-center">
        <ShieldCheck size={22} strokeWidth={1.5} className="mx-auto text-ink-3" />
        <p className="mt-2 text-[15px] font-medium text-ink">
          Solo administradores y supervisores acceden a la configuración
        </p>
      </div>
    );
  }

  const save = async () => {
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.updateSmtpSettings(token, {
        host: smtp.host,
        port: Number(smtp.port) || 587,
        user: smtp.user,
        // "" limpia la contraseña (relay sin auth); la máscara intacta no toca nada
        ...(smtp.pass !== "••••••••" ? { pass: smtp.pass } : {}),
        from: smtp.from,
        secure: smtp.secure,
        enabled: smtp.enabled,
        recipients: smtp.recipients
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
      });
      setMessage("Configuración guardada");
      setPassUnreadable(false);
      setIsError(false);
    } catch {
      setMessage("Error al guardar la configuración");
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    if (!token) return;
    setMessage("Enviando email de prueba…");
    try {
      const res = await api.testSmtp(token);
      setMessage(res.message);
      setIsError(!res.sent);
    } catch {
      setMessage("Fallo al enviar el email de prueba");
      setIsError(true);
    }
  };

  const set = (key: keyof SmtpState, value: string | boolean) =>
    setSmtp((prev) => ({ ...prev, [key]: value }));

  // ── Usuarios: acciones (solo admin) ──
  const createUser = async () => {
    if (!token || !isAdmin) return;
    if (!newUser.email.trim() || !newUser.password) {
      setUsersMsg("Correo y contraseña son obligatorios");
      return;
    }
    try {
      await api.createUser(token, {
        email: newUser.email.trim(),
        name: newUser.name.trim() || newUser.email.split("@")[0],
        role: newUser.role,
        password: newUser.password,
      });
      setNewUser({ email: "", name: "", role: "agente", password: "" });
      setUsersMsg(null);
      loadUsers();
    } catch (err) {
      const detail = (err as Error).message;
      setUsersMsg(detail.includes("409") ? "Ese correo ya existe" : `No se pudo crear: ${detail.slice(0, 60)}`);
    }
  };

  const saveEdit = async (email: string) => {
    if (!token || !isAdmin) return;
    try {
      await api.updateUser(token, email, {
        name: editName.trim(),
        role: editRole,
      });
      setEditing(null);
      setUsersMsg(null);
      loadUsers();
    } catch {
      setUsersMsg("No se pudo actualizar el usuario");
    }
  };

  return (
    <div className="mx-auto max-w-[840px] animate-rise">
      <h1 className="font-display text-[30px] leading-[1.2] font-extrabold tracking-tight">
        Configuración
      </h1>
      <p className="mt-1 text-[13.5px] text-ink-3">
        Administración de usuarios (RBAC) y servidor de correo.
      </p>

      {/* ═══ Usuarios (RBAC) ═══ */}
      <Module
        title="Usuarios"
        className="mt-6"
        actions={
          <span className="text-[12px] text-ink-3">
            {isAdmin ? "Puedes crear y editar" : "Solo lectura (supervisor)"}
          </span>
        }
      >
        {usersMsg ? (
          <p className="px-5 pt-3 text-[13px] text-signal">{usersMsg}</p>
        ) : null}
        <div className="px-5 py-3">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-rule">
                <th scope="col" className="label px-2 py-2 text-ink-3">Usuario</th>
                <th scope="col" className="label px-2 py-2 text-ink-3">Rol</th>
                {isAdmin ? (
                  <th scope="col" className="label px-2 py-2 text-right text-ink-3">
                    Acciones
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-b border-rule last:border-b-0">
                  <td className="px-2 py-2.5">
                    <span className="block text-[13.5px] font-semibold text-ink">
                      {u.name}
                    </span>
                    <span className="block font-mono text-[11.5px] text-ink-3">
                      {u.email}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    {editing === u.email && isAdmin ? (
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label="Rol"
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="h-8 w-32"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </Select>
                        <TextInput
                          aria-label="Nombre"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-8 w-36"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => void saveEdit(u.email)}
                        >
                          Guardar
                        </Button>
                      </div>
                    ) : (
                      <RoleChip role={u.role} />
                    )}
                  </td>
                  {isAdmin ? (
                    <td className="px-2 py-2.5 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={u.email === user?.email}
                        onClick={() => {
                          setEditing(u.email);
                          setEditName(u.name);
                          setEditRole(u.role);
                        }}
                      >
                        Editar
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isAdmin ? (
          <div className="border-t border-rule px-5 py-4">
            <p className="label text-ink-2">Nuevo usuario</p>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <Field label="Correo" htmlFor="nu-email">
                <TextInput
                  id="nu-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="nombre@edrs.xyz"
                />
              </Field>
              <Field label="Nombre" htmlFor="nu-name">
                <TextInput
                  id="nu-name"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Nombre y apellido"
                />
              </Field>
              <Field label="Rol" htmlFor="nu-role">
                <Select
                  id="nu-role"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, role: e.target.value }))
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Contraseña" htmlFor="nu-pass">
                <TextInput
                  id="nu-pass"
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, password: e.target.value }))
                  }
                  placeholder="mínimo 8 caracteres"
                />
              </Field>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              onClick={() => void createUser()}
            >
              Crear usuario
            </Button>
          </div>
        ) : null}
      </Module>

      {/* ═══ SMTP (solo admin) ═══ */}
      {isAdmin ? (
        <section className="mt-6 rounded-xl border border-rule bg-raised">
          <header className="flex items-center gap-2 border-b border-rule px-5 py-3">
            <h2 className="label text-ink-2">Servidor SMTP</h2>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[13px] text-ink-3">Activo</span>
              <Segmented
                name="smtp-enabled"
                value={smtp.enabled ? "si" : "no"}
                onChange={(v) => set("enabled", v === "si")}
                options={[
                  { value: "si" as const, label: "Sí" },
                  { value: "no" as const, label: "No" },
                ]}
              />
            </div>
          </header>
          <div className="space-y-5 px-5 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Servidor" htmlFor="smtp-host">
                <TextInput
                  id="smtp-host"
                  value={smtp.host}
                  onChange={(e) => set("host", e.target.value)}
                  placeholder="smtp.gmail.com"
                />
              </Field>
              <Field label="Puerto" htmlFor="smtp-port">
                <TextInput
                  id="smtp-port"
                  type="number"
                  value={smtp.port}
                  onChange={(e) => set("port", e.target.value)}
                  placeholder="587"
                />
              </Field>
              <Field label="Seguridad" htmlFor="smtp-secure">
                <div className="pt-1.5">
                  <Segmented
                    name="smtp-secure"
                    value={smtp.secure ? "ssl" : "starttls"}
                    onChange={(v) => set("secure", v === "ssl")}
                    options={[
                      { value: "starttls" as const, label: "STARTTLS" },
                      { value: "ssl" as const, label: "SSL" },
                    ]}
                  />
                </div>
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Usuario" htmlFor="smtp-user">
                <TextInput
                  id="smtp-user"
                  value={smtp.user}
                  onChange={(e) => set("user", e.target.value)}
                  placeholder="usuario@edrs.xyz"
                />
              </Field>
              <Field
                label="Contraseña"
                htmlFor="smtp-pass"
                hint="Se enmascara al guardar. Deja el campo enmascarado sin cambiar para conservar la actual."
              >
                <TextInput
                  id="smtp-pass"
                  type="password"
                  value={smtp.pass}
                  onChange={(e) => set("pass", e.target.value)}
                />
              </Field>
            </div>
            <Field label="Remitente" htmlFor="smtp-from">
              <TextInput
                id="smtp-from"
                value={smtp.from}
                onChange={(e) => set("from", e.target.value)}
                placeholder="tickitflow@edrs.xyz"
              />
            </Field>
            <Field
              label="Destinatarios de notificaciones"
              htmlFor="smtp-recipients"
              hint="Correos separados por coma."
            >
              <TextInput
                id="smtp-recipients"
                value={smtp.recipients}
                onChange={(e) => set("recipients", e.target.value)}
                placeholder="admin@edrs.xyz, soporte@edrs.xyz"
              />
            </Field>
            {passUnreadable ? (
              <p
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-rule bg-raised px-3 py-2 text-[13px] text-ink-2"
              >
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-signal animate-pulse-dot" />
                La contraseña guardada no se puede descifrar (clave rotada o dato
                corrupto). Re-ingresa el password SMTP y guarda para restaurarla.
              </p>
            ) : null}
          </div>
          <footer className="flex flex-wrap items-center gap-3 border-t border-rule px-5 py-3">
            <Button variant="primary" size="sm" disabled={saving} onClick={() => void save()}>
              <Save size={14} strokeWidth={1.75} aria-hidden />
              {saving ? "Guardando…" : "Guardar configuración"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void test()}>
              <Send size={14} strokeWidth={1.75} aria-hidden />
              Probar email
            </Button>
            {message ? (
              <p className={`text-[13px] ${isError ? "text-signal" : "text-good"}`}>
                {message}
              </p>
            ) : null}
          </footer>
        </section>
      ) : (
        <p className="mt-6 text-[13px] text-ink-3">
          La configuración del servidor SMTP es exclusiva de administradores.
        </p>
      )}
    </div>
  );
}
