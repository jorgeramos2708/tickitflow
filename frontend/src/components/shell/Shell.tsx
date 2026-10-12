import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Database,
  Inbox,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Users,
  UserRoundCheck,
  FileCheck,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { LogoLockup } from "../../brand/Logo";
import { useAuth } from "../../lib/auth";
import { useStore } from "../../lib/store";
import { OPEN_STATUSES } from "../../lib/types";
import { slaOf } from "../../lib/sla";
import { NotificationsBell } from "./Notifications";
import { ThemeToggle } from "./ThemeToggle";

const ICONS = {
  dashboard: LayoutDashboard,
  mis: Inbox,
  sinAsignar: UserRoundCheck,
  aprobaciones: FileCheck,
  incidente: AlertCircle,
  requerimiento: ClipboardList,
  problema: Search,
  cambio: ArrowLeftRight,
  cmdb: Database,
  clientes: Users,
  kb: BookOpen,
  reportes: BarChart3,
  config: Settings,
} as const;

type RailIcon = keyof typeof ICONS;

type AlertLevel = "none" | "sla" | "approval";

interface RailItem {
  to: string;
  label: string;
  icon: RailIcon;
  count?: number;
  alert?: AlertLevel;
  subItems?: { to: string; label: string; count?: number; alert?: boolean }[];
}

interface RailSection {
  id: string;
  label: string;
  items: RailItem[];
}

function useRailData() {
  const { tickets, problems, changes, now, me } = useStore();

  const openIncidents = tickets.filter(
    (t) => t.practice === "incidente" && OPEN_STATUSES.includes(t.status),
  );
  const openRequests = tickets.filter(
    (t) => t.practice === "requerimiento" && OPEN_STATUSES.includes(t.status),
  );
  const atRisk = tickets.filter(
    (t) =>
      OPEN_STATUSES.includes(t.status) && slaOf(t, now).level !== "ok",
  );
  const criticalIncidents = openIncidents.filter(
    (t) => slaOf(t, now).level === "breach",
  );
  const unassigned = tickets.filter(
    (t) => OPEN_STATUSES.includes(t.status) && t.assignee === null,
  );
  const myTickets = tickets.filter(
    (t) => t.assignee === me && OPEN_STATUSES.includes(t.status),
  );
  const pendingApprovals = changes.filter(
    (c) => c.status === "en_revision",
  );
  const openProblems = problems.filter(
    (p) => p.status === "nuevo" || p.status === "investigacion",
  );
  const openChanges = changes.filter((c) => c.status === "en_revision");

  const hasSlaAlert = atRisk.length > 0;
  const hasApprovalAlert = pendingApprovals.length > 0;

  return {
    openIncidents,
    openRequests,
    atRisk,
    criticalIncidents,
    unassigned,
    myTickets,
    pendingApprovals,
    openProblems,
    openChanges,
    hasSlaAlert,
    hasApprovalAlert,
  };
}

function fmtCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}

/** Contador con estilo de alerta opcional (píldora roja para SLA). */
function RailCount({
  count,
  alert,
  hidden,
}: {
  count: number;
  alert?: AlertLevel;
  hidden?: boolean;
}) {
  if (count === 0 || hidden) return null;
  if (alert === "sla") {
    return (
      <span className="ml-auto inline-flex items-center rounded-full bg-signal/15 px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-signal">
        {fmtCount(count)}
      </span>
    );
  }
  return (
    <span className="ml-auto font-mono text-[11px] font-medium tabular-nums text-ink-3">
      {fmtCount(count)}
    </span>
  );
}

/** Barra de 3px pegada al borde izquierdo (solo si es rail abierto). */
function RailLink({
  to,
  label,
  icon,
  count,
  alert,
  collapsed,
}: {
  to: string;
  label: string;
  icon: RailIcon;
  count?: number;
  alert?: AlertLevel;
  collapsed?: boolean;
}) {
  const { pathname } = useLocation();
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  const Icon = ICONS[icon];

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      aria-label={count !== undefined && count > 0 ? `${label}, ${count}` : label}
      className={cn(
        "relative flex items-center gap-2.5 rounded-r-lg py-2 text-[13px] transition-colors duration-150",
        collapsed ? "justify-center px-2" : "px-3",
        active
          ? "bg-amber-fill/10 font-medium text-amber"
          : "text-ink-2 hover:bg-ink/5",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 left-0 w-[3px] bg-amber-fill"
        />
      ) : null}
      <Icon size={16} strokeWidth={1.75} aria-hidden />
      {!collapsed ? label : null}
      {!collapsed ? (
        <RailCount count={count ?? 0} alert={alert} />
      ) : count !== undefined && count > 0 ? (
        <span
          aria-hidden
          className={cn(
            "absolute top-1.5 right-1.5 size-[7px] rounded-full",
            alert === "sla" ? "bg-signal" : "bg-amber-fill",
          )}
        />
      ) : null}
      {collapsed ? (
        <span className="pointer-events-none absolute left-full z-50 ml-2 rounded-lg border border-rule bg-raised px-2 py-1 text-[12px] whitespace-nowrap text-ink-2 opacity-0 shadow-3 transition-opacity duration-150 group-hover:opacity-100">
          {label}
          {count !== undefined && count > 0 ? ` (${count})` : ""}
        </span>
      ) : null}
    </Link>
  );
}

/** Sección plegable con chevron, alerta y persistencia. */
function RailSection({
  section,
  collapsed,
  storageKey,
  onToggle,
}: {
  section: RailSection;
  collapsed: boolean;
  storageKey: string;
  onToggle: (id: string) => void;
}) {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === null ? true : saved === "open";
  });
  const sectionId = `rail-section-${section.id}`;

  useEffect(() => {
    localStorage.setItem(storageKey, isOpen ? "open" : "closed");
  }, [isOpen, storageKey]);

  // Si la ruta activa está en esta sección, ábrela automáticamente
  useEffect(() => {
    const active = section.items.some((item) =>
      item.to === "/" ? pathname === "/" : pathname.startsWith(item.to),
    );
    if (active) setIsOpen(true);
  }, [pathname, section.items]);

  const hasAlert = section.items.some((item) => item.alert === "sla");
  const activeInSection = section.items.some((item) =>
    item.to === "/" ? pathname === "/" : pathname.startsWith(item.to),
  );

  if (collapsed) {
    return (
      <>
        <div className="mx-2 my-1.5 h-px bg-rule" aria-hidden />
        {section.items.map((item) => (
          <RailLink
            key={item.to}
            {...item}
            collapsed
          />
        ))}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={sectionId}
        onClick={() => {
          setIsOpen(!isOpen);
          onToggle(section.id);
        }}
        className="group flex w-full items-center gap-1 px-2 py-1.5 text-left"
      >
        <span className="label flex-1 text-ink-3">{section.label}</span>
        {hasAlert || activeInSection ? (
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              hasAlert ? "bg-signal" : "bg-amber-fill",
            )}
          />
        ) : null}
        <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          {isOpen ? (
            <ChevronDown size={12} strokeWidth={2} className="text-ink-3" aria-hidden />
          ) : (
            <ChevronRight size={12} strokeWidth={2} className="text-ink-3" aria-hidden />
          )}
        </span>
      </button>
      {isOpen ? (
        <ul id={sectionId} className="space-y-0.5">
          {section.items.map((item) => (
            <li key={item.to}>
              <RailLink {...item} />
              {item.subItems ? (
                <ul className="mt-0.5 ml-[38px] space-y-0.5">
                  {item.subItems.map((sub) => (
                    <li key={sub.to}>
                      <Link
                        to={sub.to}
                        aria-current={pathname === sub.to ? "page" : undefined}
                        className={cn(
                          "flex items-center rounded-r-lg px-2 py-1 text-[12px] transition-colors",
                          pathname === sub.to
                            ? "bg-amber-fill/10 font-medium text-amber"
                            : "text-ink-3 hover:bg-ink/5",
                        )}
                      >
                        {sub.label}
                        {sub.count !== undefined && sub.count > 0 ? (
                          <RailCount
                            count={sub.count}
                            alert={sub.alert ? "sla" : undefined}
                          />
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PracticeRail({ onOpenPalette }: { onOpenPalette: () => void }) {  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("tickitflow.rail.collapsed") === "true",
  );
  const { user, logout, live } = useAuth();
  const data = useRailData();

  useEffect(() => {
    localStorage.setItem("tickitflow.rail.collapsed", String(collapsed));
  }, [collapsed]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((v) => !v);
  }, []);

  // Atajo: Ctrl+B o Cmd+B colapsa el sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapse]);

  const name = user?.name ?? "Jorge Ramos";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  const sections: RailSection[] = [
    {
      id: "mi-trabajo",
      label: "Mi trabajo",
      items: [
        { to: "/", label: "Dashboard", icon: "dashboard" },
        { to: "/mis-tickets", label: "Mis tickets", icon: "mis", count: data.myTickets.length },
        { to: "/sin-asignar", label: "Sin asignar", icon: "sinAsignar", count: data.unassigned.length },
        {
          to: "/aprobaciones",
          label: "Aprobaciones",
          icon: "aprobaciones",
          count: data.pendingApprovals.length,
          alert: data.hasApprovalAlert ? "approval" : undefined,
        },
      ],
    },
    {
      id: "gestion",
      label: "Gestión",
      items: [
        {
          to: "/cola/incidente",
          label: "Incidentes",
          icon: "incidente",
          count: data.openIncidents.length,
          alert: data.hasSlaAlert ? "sla" : undefined,
          subItems: [
            {
              to: "/cola/incidente?filtro=criticos",
              label: "Críticos",
              count: data.criticalIncidents.length,
            },
            {
              to: "/cola/incidente?filtro=sla",
              label: "En riesgo de SLA",
              count: data.atRisk.length,
              alert: data.atRisk.length > 0,
            },
          ],
        },
        { to: "/cola/requerimiento", label: "Requerimientos", icon: "requerimiento", count: data.openRequests.length },
        { to: "/problemas", label: "Problemas", icon: "problema", count: data.openProblems.length },
        { to: "/cambios", label: "Cambios", icon: "cambio", count: data.openChanges.length },
      ],
    },
    {
      id: "conocimiento",
      label: "Conocimiento y activos",
      items: [
        { to: "/cmdb", label: "CMDB", icon: "cmdb" },
        { to: "/kb", label: "Base de conocimiento", icon: "kb" },
      ],
    },
    {
      id: "administracion",
      label: "Administración",
      items: [
        { to: "/clientes", label: "Clientes", icon: "clientes" },
        { to: "/reportes", label: "Reportes", icon: "reportes" },
      ],
    },
  ];

  return (
    <nav
      aria-label="Navegación"
      className={cn(
        "hidden shrink-0 border-r border-rule bg-paper transition-[width] duration-150 md:block",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Botón colapsar + Nuevo ticket + Búsqueda */}
        <div className={cn("flex items-center gap-1 px-2 py-2", collapsed && "justify-center")}>
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label={collapsed ? "Expandir panel" : "Colapsar panel"}
            title={collapsed ? "Expandir panel (Ctrl+B)" : "Colapsar panel (Ctrl+B)"}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
          >
            {collapsed ? (
              <PanelLeftOpen size={14} strokeWidth={1.75} aria-hidden />
            ) : (
              <PanelLeftClose size={14} strokeWidth={1.75} aria-hidden />
            )}
          </button>
          {!collapsed ? (
            <Link
              to="/nuevo"
              aria-label="Nuevo ticket"
              className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-fill font-display text-[12.5px] font-bold text-amber-fill-ink transition-all duration-200 hover:shadow-glow"
            >
              <Plus size={14} strokeWidth={2.5} aria-hidden />
              Nuevo ticket
            </Link>
          ) : null}
        </div>
        {!collapsed ? (
          <div className="px-3 pb-1">
            <button
              type="button"
              onClick={onOpenPalette}
              aria-label="Buscar (Ctrl+K)"
              className="flex h-7 w-full cursor-pointer items-center gap-2 rounded-lg border border-rule bg-raised px-2 text-left text-[12px] text-ink-3 transition-colors hover:border-amber"
            >
              <Search size={12} strokeWidth={1.75} aria-hidden />
              Buscar…
              <kbd className="ml-auto rounded-md border border-rule px-1 font-mono text-[10px] text-ink-3">
                ⌘K
              </kbd>
            </button>
          </div>
        ) : null}

        {/* Secciones */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {collapsed ? (
            <div className="space-y-0.5">
              {sections.map((section) => (
                <RailSection
                  key={section.id}
                  section={section}
                  collapsed={collapsed}
                  storageKey={`tickitflow.rail.${section.id}`}
                  onToggle={() => {}}
                />
              ))}
              <div className="mx-2 my-1.5 h-px bg-rule" aria-hidden />
              <div className="group relative">
                <RailLink to="/configuracion" label="Configuración" icon="config" collapsed />
              </div>
            </div>
          ) : (
            <>
              {sections.map((section) => (
                <RailSection
                  key={section.id}
                  section={section}
                  collapsed={collapsed}
                  storageKey={`tickitflow.rail.${section.id}`}
                  onToggle={() => {}}
                />
              ))}
              <div className="mx-2 my-2 h-px bg-rule/50" aria-hidden />
              <RailLink to="/configuracion" label="Configuración" icon="config" />
            </>
          )}
        </div>

        {/* Footer: usuario */}
        <div className="border-t border-rule/50 px-2 py-2">
          {collapsed ? (
            <div className="flex justify-center">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-lg bg-ink font-mono text-[11px] font-semibold text-paper"
              >
                {initials}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex size-7 items-center justify-center rounded-lg bg-ink font-mono text-[10px] font-semibold text-paper"
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-ink-2">{name}</p>
                <p className="truncate text-[10px] text-ink-3">{user?.email ?? ""}</p>
              </div>
              <NotificationsBell />
              <ThemeToggle />
              {live ? (
                <button
                  type="button"
                  onClick={logout}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
                >
                  <LogOut size={13} strokeWidth={1.75} aria-hidden />
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

/** Barra superior: marca a la izquierda; el resto ya vive en el rail. */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-rule bg-paper px-4">
      <Link to="/" aria-label="TickITFlow — inicio" className="rounded-xl">
        <LogoLockup />
      </Link>
    </header>
  );
}