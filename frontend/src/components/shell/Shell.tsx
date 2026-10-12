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

interface SubItem {
  to: string;
  label: string;
  count?: number;
  alert?: boolean;
}

interface RailItem {
  to: string;
  label: string;
  icon: RailIcon;
  count?: number;
  alert?: AlertLevel;
  subItems?: SubItem[];
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
    (t) => OPEN_STATUSES.includes(t.status) && slaOf(t, now).level !== "ok",
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
  const pendingApprovals = changes.filter((c) => c.status === "en_revision");
  const openProblems = problems.filter(
    (p) => p.status === "nuevo" || p.status === "investigacion",
  );
  const openChanges = changes.filter((c) => c.status === "en_revision");

  return {
    openIncidents: openIncidents.length,
    openRequests: openRequests.length,
    atRisk: atRisk.length,
    criticalIncidents: criticalIncidents.length,
    unassigned: unassigned.length,
    myTickets: myTickets.length,
    pendingApprovals: pendingApprovals.length,
    openProblems: openProblems.length,
    openChanges: openChanges.length,
    hasSlaAlert: atRisk.length > 0,
    hasApprovalAlert: pendingApprovals.length > 0,
  };
}

function fmtCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}

/** Contador con estilo de alerta (píldora roja SLA) o normal (mono apagado). */
function RailCount({ count, alert }: { count: number; alert?: AlertLevel }) {
  if (count === 0) return null;
  if (alert === "sla") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-signal/15 px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-signal">
        {fmtCount(count)}
      </span>
    );
  }
  return (
    <span className="shrink-0 font-mono text-[11px] font-medium tabular-nums text-ink-3">
      {fmtCount(count)}
    </span>
  );
}

/** Link del rail con icono, label flex-1 (contador alineado derecha) y barra activo. */
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
        "group relative flex items-center rounded-r-lg py-2 text-[13px] transition-colors duration-150",
        collapsed ? "justify-center px-2" : "gap-2.5 px-3",
        active ? "bg-amber-fill/10 font-medium text-amber" : "text-ink-2 hover:bg-ink/5",
      )}
    >
      {active ? (
        <span aria-hidden className="absolute top-1 bottom-1 left-0 w-[3px] bg-amber-fill" />
      ) : null}
      <Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <RailCount count={count ?? 0} alert={alert} />
        </>
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
        <span className="pointer-events-none absolute left-full z-50 ml-2 rounded-lg border border-rule bg-raised px-2 py-1 text-[12px] whitespace-nowrap text-ink-2 opacity-0 shadow-3 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
          {label}
          {count !== undefined && count > 0 ? ` (${count})` : ""}
        </span>
      ) : null}
    </Link>
  );
}

/** Item con sub-items colapsables (Incidentes → Críticos, En riesgo). */
function RailItemWithSubs({
  item,
  pathname,
}: {
  item: RailItem;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(`tickitflow.rail.sub.${item.to}`);
    return saved === null ? false : saved === "open";
  });
  const subId = `rail-sub-${item.to.replace(/\//g, "-")}`;
  const active = pathname.startsWith(item.to);

  useEffect(() => {
    localStorage.setItem(`tickitflow.rail.sub.${item.to}`, isOpen ? "open" : "closed");
  }, [isOpen, item.to]);

  // Si una sub-ruta está activa, abre automáticamente
  useEffect(() => {
    if (item.subItems?.some((s) => pathname === s.to)) setIsOpen(true);
  }, [pathname, item.subItems]);

  const Icon = ICONS[item.icon];
  const hasSubAlert = item.subItems?.some((s) => s.alert);

  return (
    <li>
      <div className="flex items-center">
        <Link
          to={item.to}
          aria-current={active ? "page" : undefined}
          aria-label={item.count !== undefined && item.count > 0 ? `${item.label}, ${item.count}` : item.label}
          className={cn(
            "group relative flex min-w-0 flex-1 items-center gap-2.5 rounded-l-lg py-2 pl-3 text-[13px] transition-colors duration-150",
            active ? "bg-amber-fill/10 font-medium text-amber" : "text-ink-2 hover:bg-ink/5",
          )}
        >
          {active ? (
            <span aria-hidden className="absolute top-1 bottom-1 left-0 w-[3px] bg-amber-fill" />
          ) : null}
          <Icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          <RailCount count={item.count ?? 0} alert={item.alert} />
          <span className="w-2 shrink-0" aria-hidden />
        </Link>
        {item.subItems ? (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={subId}
            aria-label={`${isOpen ? "Colapsar" : "Expandir"} ${item.label}`}
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-r-lg transition-colors",
              active ? "text-amber/70 hover:text-amber" : "text-ink-3/50 hover:text-ink-3",
            )}
          >
            {isOpen ? (
              <ChevronDown size={12} strokeWidth={2} aria-hidden />
            ) : (
              <ChevronRight size={12} strokeWidth={2} aria-hidden />
            )}
          </button>
        ) : null}
      </div>
      {isOpen && item.subItems ? (
        <ul id={subId} className="mt-0.5 ml-[38px] space-y-0.5">
          {item.subItems.map((sub) => (
            <li key={sub.to}>
              <Link
                to={sub.to}
                aria-current={pathname === sub.to ? "page" : undefined}
                aria-label={sub.count !== undefined && sub.count > 0 ? `${sub.label}, ${sub.count}` : sub.label}
                className={cn(
                  "flex items-center rounded-r-lg px-2 py-1.5 text-[12px] transition-colors",
                  pathname === sub.to
                    ? "bg-amber-fill/10 font-medium text-amber"
                    : "text-ink-3 hover:bg-ink/5",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{sub.label}</span>
                {sub.count !== undefined ? (
                  <RailCount count={sub.count} alert={sub.alert ? "sla" : undefined} />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {hasSubAlert && !isOpen ? (
        <span
          aria-hidden
          className="absolute right-8 mt-[-28px] size-1.5 rounded-full bg-signal"
        />
      ) : null}
    </li>
  );
}

/** Sección plegable con chevron, alerta y persistencia. */
function RailSection({
  section,
  collapsed,
  storageKey,
  pathname,
}: {
  section: RailSection;
  collapsed: boolean;
  storageKey: string;
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === null ? true : saved === "open";
  });
  const sectionId = `rail-section-${section.id}`;

  useEffect(() => {
    localStorage.setItem(storageKey, isOpen ? "open" : "closed");
  }, [isOpen, storageKey]);

  const hasAlert = section.items.some((item) => item.alert === "sla");
  const activeInSection = section.items.some((item) =>
    item.to === "/" ? pathname === "/" : pathname.startsWith(item.to),
  );

  if (collapsed) {
    return (
      <>
        <div className="mx-2 my-1.5 h-px bg-rule" aria-hidden />
        {section.items.map((item) => (
          <RailLink key={item.to} {...item} collapsed />
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
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center gap-1 px-2 py-1.5 text-left"
      >
        <span className="label flex-1 text-ink-3">{section.label}</span>
        {hasAlert || activeInSection ? (
          <span
            aria-hidden
            className={cn("size-1.5 rounded-full", hasAlert ? "bg-signal" : "bg-amber-fill")}
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
          {section.items.map((item) =>
            item.subItems ? (
              <RailItemWithSubs key={item.to} item={item} pathname={pathname} />
            ) : (
              <li key={item.to}>
                <RailLink {...item} />
              </li>
            ),
          )}
        </ul>
      ) : null}
    </div>
  );
}

export function PracticeRail({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem("tickitflow.rail.collapsed") === "true",
  );
  const { user, logout, live } = useAuth();
  const data = useRailData();
  const { pathname } = useLocation();

  useEffect(() => {
    localStorage.setItem("tickitflow.rail.collapsed", String(collapsed));
  }, [collapsed]);

  const toggleCollapse = useCallback(() => setCollapsed((v) => !v), []);

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
        { to: "/mis-tickets", label: "Mis tickets", icon: "mis", count: data.myTickets },
        { to: "/sin-asignar", label: "Sin asignar", icon: "sinAsignar", count: data.unassigned },
        {
          to: "/aprobaciones",
          label: "Aprobaciones",
          icon: "aprobaciones",
          count: data.pendingApprovals,
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
          count: data.openIncidents,
          alert: data.hasSlaAlert ? "sla" : undefined,
          subItems: [
            {
              to: "/cola/incidente?filtro=criticos",
              label: "Críticos",
              count: data.criticalIncidents,
            },
            {
              to: "/cola/incidente?filtro=sla",
              label: "En riesgo de SLA",
              count: data.atRisk,
              alert: data.atRisk > 0,
            },
          ],
        },
        { to: "/cola/requerimiento", label: "Requerimientos", icon: "requerimiento", count: data.openRequests },
        { to: "/problemas", label: "Problemas", icon: "problema", count: data.openProblems },
        { to: "/cambios", label: "Cambios", icon: "cambio", count: data.openChanges },
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
        {/* Colapsar + Nuevo ticket */}
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
        {/* Búsqueda */}
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
          {sections.map((section) => (
            <RailSection
              key={section.id}
              section={section}
              collapsed={collapsed}
              storageKey={`tickitflow.rail.${section.id}`}
              pathname={pathname}
            />
          ))}
          <div className="mx-2 my-2 h-px bg-rule/50" aria-hidden />
          <RailLink to="/configuracion" label="Configuración" icon="config" collapsed={collapsed} />
        </div>

        {/* Footer: solo usuario (campana y tema ya viven en el TopBar) */}
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
                className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink font-mono text-[10px] font-semibold text-paper"
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-ink-2">{name}</p>
                <p className="truncate text-[10px] text-ink-3">{user?.email ?? ""}</p>
              </div>
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

/** Barra superior: marca + campana + tema (separados, fuera del sidebar). */
export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-rule bg-paper px-4">
      <Link to="/" aria-label="TickITFlow — inicio" className="rounded-xl">
        <LogoLockup />
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <NotificationsBell />
        <span className="h-5 w-px bg-rule" aria-hidden />
      </div>
    </header>
  );
}
