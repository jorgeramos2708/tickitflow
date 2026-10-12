import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Link, Route, Routes, useNavigate } from "react-router-dom";
import { CommandPalette } from "./components/CommandPalette";
import { PracticeRail, TopBar } from "./components/shell/Shell";
import { StoreProvider } from "./lib/store";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ChangesView, ChangeDetail } from "./views/ChangesView";
import { CmdbView } from "./views/CmdbView";
import { MisTicketsView, SinAsignarView, AprobacionesView } from "./views/MisVistas";
import { ClientesView } from "./views/ClientesView";
import { KbArticleView, KbView } from "./views/KbView";
import { ProblemDetail, ProblemsView } from "./views/ProblemsView";
import { NewChange } from "./views/NewChange";
import { NewProblem } from "./views/NewProblem";
import { ReportesView } from "./views/ReportesView";
import { ConfiguracionView } from "./views/ConfiguracionView";
import { Dashboard } from "./views/Dashboard";
import { NewTicket } from "./views/NewTicket";
import { EmptyQueue, QueueView } from "./views/QueueView";
import { TicketDetail } from "./views/TicketDetail";
import { PortalShell } from "./components/portal/PortalShell";
import { CatalogView } from "./views/portal/CatalogView";
import { CatalogRequestView, ReportIncidentView } from "./views/portal/PortalForms";
import { MyTicketsView, PortalTicketView } from "./views/portal/MyTicketsView";
import { Acceso } from "./views/Acceso";
import { Landing } from "./views/Landing";
import { LogoLockup } from "./brand/Logo";
import { Button } from "./components/ui/Button";
import { AuthProvider, useAuth } from "./lib/auth";
import { ModeProvider } from "./lib/mode";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}
function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const lastGRef = useRef(0);
  const { live, user } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === "g") {
        lastGRef.current = Date.now();
        return;
      }
      if (Date.now() - lastGRef.current < 700) {
        if (e.key === "d") navigate("/");
        else if (e.key === "i") navigate("/cola/incidente");
        else if (e.key === "r") navigate("/cola/requerimiento");
        else if (e.key === "p") navigate("/problemas");
        else if (e.key === "c") navigate("/cambios");
        else if (e.key === "m") navigate("/cmdb");
        else if (e.key === "k") navigate("/kb");
        else if (e.key === "e") navigate("/reportes");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  if (live && !user) return <Acceso />;

  // La consola es del equipo de soporte: las cuentas de portal se quedan en su superficie.
  if (live && user?.role === "usuario") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-5">
        <div className="w-full max-w-sm animate-rise">
          <div className="flex justify-center">
            <LogoLockup />
          </div>
          <div className="mt-6 rounded-xl border border-rule bg-raised px-6 py-6 text-center">
            <h1 className="font-display text-[20px] leading-tight font-extrabold tracking-tight">
              La consola es del equipo de soporte
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-3">
              Tu cuenta ({user.name}) es del portal de autoservicio. Para
              gestionar tickets, problemas y cambios necesitas una cuenta de
              agente.
            </p>
            <Link to="/portal" className="mt-5 inline-block">
              <Button variant="primary">Ir al portal de autoservicio</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-paper">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-amber-fill focus:px-4 focus:py-2 focus:font-bold focus:text-amber-fill-ink"
      >
        Saltar al contenido
      </a>
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <PracticeRail onOpenPalette={() => setPaletteOpen(true)} />
        <main
          id="contenido"
          className="min-w-0 flex-1 overflow-y-auto px-5 py-7 md:px-8"
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cola/:practice" element={<QueueView />} />
            <Route path="/ticket/:id" element={<TicketDetail />} />
            <Route path="/nuevo" element={<NewTicket />} />
            <Route path="/nuevo/problema" element={<NewProblem />} />
            <Route path="/nuevo/cambio" element={<NewChange />} />
            <Route path="/reportes" element={<ReportesView />} />
            <Route path="/configuracion" element={<ConfiguracionView />} />
            <Route path="/problemas" element={<ProblemsView />} />
            <Route path="/problemas/:id" element={<ProblemDetail />} />
            <Route path="/cambios" element={<ChangesView />} />
            <Route path="/cambios/:id" element={<ChangeDetail />} />
            <Route path="/mis-tickets" element={<MisTicketsView />} />
            <Route path="/sin-asignar" element={<SinAsignarView />} />
            <Route path="/aprobaciones" element={<AprobacionesView />} />
            <Route path="/cmdb" element={<CmdbView />} />
            <Route path="/clientes" element={<ClientesView />} />
            <Route path="/kb" element={<KbView />} />
            <Route path="/kb/:id" element={<KbArticleView />} />
            <Route
              path="*"
              element={
                <EmptyQueue
                  title="Página no encontrada"
                  hint="La ruta no existe en esta versión de la consola."
                />
              }
            />
          </Routes>
        </main>
      </div>
      <CommandPalette open={paletteOpen} setOpen={setPaletteOpen} />
    </div>
  );
}

function Portal() {
  const { live, user } = useAuth();
  if (live && !user) return <Acceso />;
  return (
    <PortalShell>
      <Routes>
        <Route index element={<CatalogView />} />
        <Route path="solicitud/:itemId" element={<CatalogRequestView />} />
        <Route path="incidente" element={<ReportIncidentView />} />
        <Route path="mis-tickets" element={<MyTicketsView />} />
        <Route path="ticket/:id" element={<PortalTicketView />} />
        <Route path="ayuda" element={<KbView basePath="/portal/ayuda" />} />
        <Route
          path="ayuda/:id"
          element={<KbArticleView basePath="/portal/ayuda" />}
        />
        <Route
          path="*"
          element={
            <EmptyQueue
              title="Página no encontrada"
              hint="La ruta no existe en esta versión del portal."
            />
          }
        />
      </Routes>
    </PortalShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ModeProvider>
        <AuthProvider>
          <StoreProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/landing" element={<Landing />} />
                <Route path="/portal/*" element={<Portal />} />
                <Route path="/*" element={<Shell />} />
              </Routes>
            </BrowserRouter>
          </StoreProvider>
        </AuthProvider>
      </ModeProvider>
    </ErrorBoundary>
  );
}
