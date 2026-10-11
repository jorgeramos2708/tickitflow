import { useEffect, useState } from "react";
import { Building2, Mail, Phone, Search, UserRound } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Field, Segmented, TextInput } from "../components/ui/Field";
import { Module } from "../components/ui/Module";
import { api, type ApiClient } from "../lib/api";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";

type ClientType = "interno" | "externo";

const TYPE_STYLE: Record<ClientType, string> = {
  interno:
    "border-status-progreso/30 bg-status-progreso/10 text-status-progreso",
  externo:
    "border-status-asignado/30 bg-status-asignado/10 text-status-asignado",
};

function TypeChip({ type }: { type: ClientType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11.5px] font-semibold",
        TYPE_STYLE[type],
      )}
    >
      {type}
    </span>
  );
}

const EMPTY = {
  name: "",
  type: "externo" as ClientType,
  email: "",
  phone: "",
  company: "",
  notes: "",
};

export function ClientesView() {
  const { token, user } = useAuth();
  const canWrite = user?.role === "admin" || user?.role === "agente";
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todos" | ClientType>("todos");
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState({ ...EMPTY });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    setError(null);
    api
      .listClients(token)
      .then((rows) => setClients(rows))
      .catch(() => setError("No se pudo cargar el directorio de clientes"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filtered = clients.filter((c) => {
    if (filter !== "todos" && c.type !== filter) return false;
    const q = query.trim().toLowerCase();
    if (q) {
      const hay = `${c.code} ${c.name} ${c.email} ${c.phone} ${c.company}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const createClient = async () => {
    if (!token || !form.name.trim()) {
      setFormMsg("El nombre es obligatorio");
      return;
    }
    try {
      await api.createClient(token, {
        name: form.name.trim(),
        type: form.type,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm({ ...EMPTY });
      setCreating(false);
      setFormMsg(null);
      load();
    } catch {
      setFormMsg("No se pudo crear el cliente");
    }
  };

  const saveEdit = async (code: string) => {
    if (!token || !edit.name.trim()) return;
    try {
      await api.updateClient(token, code, {
        name: edit.name.trim(),
        type: edit.type,
        email: edit.email.trim(),
        phone: edit.phone.trim(),
        company: edit.company.trim(),
        notes: edit.notes.trim(),
      });
      setEditing(null);
      load();
    } catch {
      setError("No se pudo actualizar el cliente");
    }
  };

  return (
    <div className="mx-auto max-w-[1000px] animate-rise">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[34px] leading-[1.1] font-extrabold tracking-tight">
            Clientes
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Directorio de internos (empleados y áreas) y externos
            (clientes y proveedores).
          </p>
        </div>
        {canWrite ? (
          <Button
            variant="primary"
            onClick={() => {
              setCreating((v) => !v);
              setForm({ ...EMPTY });
              setFormMsg(null);
            }}
          >
            Nuevo cliente
          </Button>
        ) : null}
      </div>

      {/* Barra de filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["todos", "interno", "externo"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              "h-7 cursor-pointer rounded-lg border px-2.5 text-[12px] font-semibold transition-all duration-200 hover:-translate-y-px",
              filter === f
                ? f === "interno"
                  ? "border-status-progreso/40 bg-status-progreso/15 text-status-progreso"
                  : f === "externo"
                    ? "border-status-asignado/40 bg-status-asignado/15 text-status-asignado"
                    : "border-amber-fill bg-amber-fill text-amber-fill-ink"
                : "border-rule text-ink-2 hover:border-amber",
            )}
          >
            {f === "todos" ? "Todos" : f === "interno" ? "Internos" : "Externos"}
          </button>
        ))}
        <div className="ml-auto w-64">
          <div className="relative">
            <Search
              size={13}
              strokeWidth={1.75}
              aria-hidden
              className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
            />
            <TextInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, correo, empresa…"
              aria-label="Buscar clientes"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Formulario de alta */}
      {creating && canWrite ? (
        <Module title="Nuevo cliente" className="mt-4">
          <div className="space-y-4 px-5 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Nombre" htmlFor="cl-name">
                <TextInput
                  id="cl-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nombre o razón social"
                />
              </Field>
              <Field label="Tipo" htmlFor="cl-type">
                <div className="pt-1.5">
                  <Segmented
                    name="cl-type"
                    value={form.type}
                    onChange={(v) => setForm((p) => ({ ...p, type: v as ClientType }))}
                    options={[
                      { value: "interno" as const, label: "Interno" },
                      { value: "externo" as const, label: "Externo" },
                    ]}
                  />
                </div>
              </Field>
              <Field
                label={form.type === "interno" ? "Área / Departamento" : "Empresa"}
                htmlFor="cl-company"
              >
                <TextInput
                  id="cl-company"
                  value={form.company}
                  onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                  placeholder={form.type === "interno" ? "Finanzas" : "Grupo Vanti C.A."}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Correo" htmlFor="cl-email">
                <TextInput
                  id="cl-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="contacto@empresa.com"
                />
              </Field>
              <Field label="Teléfono" htmlFor="cl-phone">
                <TextInput
                  id="cl-phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+58 212 555 0000"
                />
              </Field>
            </div>
            <Field label="Notas" htmlFor="cl-notes">
              <TextInput
                id="cl-notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Contexto, SLA contractual, contacto preferido…"
              />
            </Field>
            {formMsg ? <p className="text-[13px] text-signal">{formMsg}</p> : null}
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => void createClient()}>
                Guardar cliente
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </Module>
      ) : null}

      {/* Directorio */}
      {error ? (
        <p role="alert" className="mt-6 text-[13.5px] text-signal">
          {error}
        </p>
      ) : null}

      <Module
        title="Directorio"
        count={`${filtered.length}`}
        className="mt-4"
        actions={
          <span className="text-[12px] text-ink-3">
            {clients.filter((c) => c.type === "interno").length} internos ·{" "}
            {clients.filter((c) => c.type === "externo").length} externos
          </span>
        }
      >
        {loading ? (
          <div className="px-5 py-8 text-center text-[13px] text-ink-3">
            Cargando directorio…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <UserRound size={22} strokeWidth={1.5} aria-hidden className="mx-auto text-ink-3" />
            <p className="mt-2 text-[15px] font-medium text-ink">
              Sin clientes en esta vista
            </p>
            <p className="mt-1 text-[15px] text-ink-3">
              Ajusta los filtros o registra un cliente nuevo.
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((c) => (
              <li
                key={c.code}
                className="border-t border-rule px-5 py-3.5 first:border-t-0"
              >
                {editing === c.code && canWrite ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <TextInput
                        aria-label="Nombre"
                        value={edit.name}
                        onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))}
                      />
                      <Segmented
                        name="edit-type"
                        value={edit.type}
                        onChange={(v) => setEdit((p) => ({ ...p, type: v as ClientType }))}
                        options={[
                          { value: "interno" as const, label: "Interno" },
                          { value: "externo" as const, label: "Externo" },
                        ]}
                      />
                      <TextInput
                        aria-label="Correo"
                        value={edit.email}
                        onChange={(e) => setEdit((p) => ({ ...p, email: e.target.value }))}
                        placeholder="Correo"
                      />
                      <TextInput
                        aria-label="Teléfono"
                        value={edit.phone}
                        onChange={(e) => setEdit((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="Teléfono"
                      />
                      <TextInput
                        aria-label={edit.type === "interno" ? "Área" : "Empresa"}
                        value={edit.company}
                        onChange={(e) => setEdit((p) => ({ ...p, company: e.target.value }))}
                        placeholder={edit.type === "interno" ? "Área" : "Empresa"}
                      />
                      <TextInput
                        aria-label="Notas"
                        value={edit.notes}
                        onChange={(e) => setEdit((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Notas"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="primary" size="sm" onClick={() => void saveEdit(c.code)}>
                        Guardar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditing(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[12px] tabular-nums text-ink-3">
                      {c.code}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
                      {c.name}
                    </span>
                    <TypeChip type={c.type} />
                    {c.company ? (
                      <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
                        <Building2 size={12} strokeWidth={1.75} aria-hidden />
                        {c.company}
                      </span>
                    ) : null}
                    {c.email ? (
                      <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
                        <Mail size={12} strokeWidth={1.75} aria-hidden />
                        {c.email}
                      </span>
                    ) : null}
                    {c.phone ? (
                      <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
                        <Phone size={12} strokeWidth={1.75} aria-hidden />
                        {c.phone}
                      </span>
                    ) : null}
                    {canWrite ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => {
                          setEditing(c.code);
                          setEdit({
                            name: c.name,
                            type: c.type,
                            email: c.email,
                            phone: c.phone,
                            company: c.company,
                            notes: c.notes,
                          });
                        }}
                      >
                        Editar
                      </Button>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Module>
    </div>
  );
}
