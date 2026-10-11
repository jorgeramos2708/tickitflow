import { SLA_TARGET_MIN } from "./sla";
import {
  PRACTICE_PREFIX,
  type Attachment,
  type Change,
  type ConfigItem,
  type KbArticle,
  type Practice,
  type Problem,
  type Priority,
  type Ticket,
  type TicketEvent,
  type TicketStatus,
} from "./types";

export const AGENTS = [
  "Ana Bustamante",
  "Carlos Duarte",
  "Elena Fonseca",
  "Gonzalo Herrera",
];
export const ME = "Jorge Ramos";
export const PORTAL_USER = { name: "M. Aguilar", dept: "Finanzas" };
export const REQUESTERS = [
  "M. Aguilar",
  "L. Cabrera",
  "D. Espinoza",
  "F. Gallardo",
  "P. Ibáñez",
  "R. Ledesma",
  "S. Montes",
  "T. Navarro",
  "V. Ocampo",
  "H. Quiroga",
];
export const DEPTS = [
  "Finanzas",
  "Recursos Humanos",
  "Ventas",
  "Operaciones",
  "Marketing",
  "Legal",
  "Logística",
];

const INCIDENTS: [string, string][] = [
  ["VPN no conecta desde casa", "El cliente de VPN se queda en «verificando» y nunca establece el túnel. Ocurre desde anoche en dos estaciones distintas."],
  ["Outlook no sincroniza la bandeja", "La bandeja de entrada no se actualiza desde ayer. Al reparar el perfil avanza y vuelve a congelarse."],
  ["Pantalla azul al abrir SAP", "La estación reinicia con error de video cada vez que se abre el módulo de contabilidad. Ya pasó tres veces hoy."],
  ["Impresora de piso 2 atascada", "La impresora del pasillo de Finanzas atrapa el papel y muestra «atasco en fusora». Nadie puede imprimir."],
  ["No puedo entrar a la carpeta compartida", "El acceso a \\\\servidor\\finanzas pide credenciales en loop y termina en «acceso denegado»."],
  ["Laptop tarda 10 minutos en iniciar", "Desde la actualización de ayer el arranque se quedó lento y el ventilador suena a máxima velocidad."],
  ["Teams sin audio en llamadas", "Los demás no escuchan al usuario. El indicador de micrófono no se mueve aunque el dispositivo aparece como habilitado."],
  ["Correo devuelve mensajes externos", "Los correos a clientes rebotan con «550 relay denied». Empezó después del cambio de DNS del viernes."],
  ["Certificado SSL vencido en el portal", "El portal de proveedores muestra advertencia de certificado vencido desde esta mañana."],
  ["Monitor parpadea en la estación de soporte", "El monitor de la mesa 4 parpadea al azar. Cambiar de puerto HDMI no lo corrige."],
  ["WiFi cae en sala de juntas", "La red inalámbrica de la sala se desconecta cada 10 minutos para todos los asistentes."],
  ["Contraseña de dominio rechazada", "La cuenta quedó bloqueada tras varios intentos. El usuario necesita acceso urgente para el cierre de mes."],
  ["Copias de backup fallaron anoche", "El trabajo programado de respaldo terminó en error 0x8. No hay respaldo de la noche anterior."],
  ["Teclado con teclas muertas", "Las teclas A, S y la barra espaciadora no responden. Es la estación de la recepción."],
  ["CRM lento al abrir clientes", "Cargar la ficha de un cliente tarda más de un minuto. El resto de la suite va bien."],
  ["Archivo compartido bloqueado", "El libro de Excel del presupuesto está bloqueado por un usuario que ya salió de vacaciones."],
  ["Escáner no envía por correo", "El multifuncional escanea pero el archivo nunca llega al destinatario configurado."],
  ["Zoom de la pantalla se quedó en 200%", "El usuario activó el aumento de pantalla por accidente y no logra regresarlo."],
];

const REQUESTS: [string, string][] = [
  ["Alta de nuevo empleado — laptop y cuentas", "Ingresa el lunes al área de Finanzas. Requiere laptop, cuenta de correo, acceso a la carpeta del área y teléfono de extensión."],
  ["Licencia de Adobe para el diseñador", "Se autorizó una licencia individual de Adobe para la nueva incorporación de Marketing."],
  ["Acceso a los reportes de BI", "El usuario del área de Ventas necesita rol de lectura sobre los tableros de ventas regionales."],
  ["Cambio de monitor por ergonomicidad", "Solicitud de monitor de 27\" con soporte articulado por recomendación médica (adjunta constancia)."],
  ["Instalación de Python para analítica", "Necesita Python 3.12 con permisos para instalar paquetes en su estación de análisis."],
  ["Alta de correo para practicante", "Practicante de Recursos Humanos por 6 meses. Crear buzón y agregar a listas internas."],
  ["Teléfono de empresa para comercial", "El ejecutivo de campo requiere equipo con plan de datos activado antes del viernes."],
  ["Acceso VPN para contratista", "Contratista externo de infraestructura por 3 semanas. Acceso VPN con MFA y expiración automática."],
  ["Memoria RAM adicional para estación", "La estación de video edición necesita pasar de 16 a 32 GB para las renders."],
  ["Licencia de software de edición de video", "Renovación anual de dos licencias del equipo de contenido."],
  ["Reposición de cargador de laptop", "El cargador dejó de funcionar. Equipo en garantía, adjunta número de serie."],
  ["Alta en el sistema de gastos", "El nuevo gerente necesita perfil de aprobador en el sistema de viáticos."],
];

const NOTES = [
  "Se solicitó evidencia al usuario para reproducir el fallo.",
  "Se reinició el servicio afectado y quedó monitoreando 15 minutos.",
  "Escalado a Redes para revisar reglas del firewall.",
  "El usuario confirma que ya puede trabajar con normalidad.",
  "Se validó la corrección en el ambiente de pruebas antes de aplicar.",
  "En espera de la ventana de mantenimiento de esta noche.",
  "Se actualizó el controlador y se dejó la estación en observación.",
  "Se agendó visita presencial para revisar el hardware.",
];

const ATTACHMENTS: Attachment[] = [
  { name: "captura-error.png", sizeKb: 340 },
  { name: "registro-vpn.log", sizeKb: 96 },
  { name: "form-alta-empleado.pdf", sizeKb: 120 },
  { name: "constancia-medica.pdf", sizeKb: 88 },
  { name: "serie-equipo.txt", sizeKb: 1 },
  { name: "diagrama-red.png", sizeKb: 512 },
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rng: () => number, arr: T[]): T =>
  arr[Math.floor(rng() * arr.length)];

function pickPriority(rng: () => number): Priority {
  const r = rng();
  if (r < 0.08) return "P1";
  if (r < 0.33) return "P2";
  if (r < 0.78) return "P3";
  return "P4";
}

function pickStatus(rng: () => number): TicketStatus {
  const r = rng();
  if (r < 0.22) return "nuevo";
  if (r < 0.4) return "asignado";
  if (r < 0.62) return "en_progreso";
  if (r < 0.72) return "pendiente_usuario";
  if (r < 0.86) return "resuelto";
  if (r < 0.94) return "cerrado";
  return "cancelado";
}

/** Semilla sintética determinista — datos de DEMOSTRACIÓN, no reales. */
export function seedTickets(now: number): Ticket[] {
  const rng = mulberry32(20260106);
  const tickets: Ticket[] = [];
  const total = 52;

  for (let i = 0; i < total; i++) {
    const practice: Practice = i < 34 ? "incidente" : "requerimiento";
    const [subject, description] = pick(
      rng,
      practice === "incidente" ? INCIDENTS : REQUESTS,
    );
    const priority = practice === "incidente" ? pickPriority(rng) : rng() < 0.3 ? "P2" : rng() < 0.6 ? "P3" : "P4";
    const status = pickStatus(rng);
    const createdAt = now - rng() * 72 * 3_600_000 - 600_000;
    const requester = pick(rng, REQUESTERS);
    const dept = pick(rng, DEPTS);
    const id = `${PRACTICE_PREFIX[practice]}-${2400 + i * 7}`;

    const events: TicketEvent[] = [];
    let evAt = createdAt;
    events.push({
      id: `${id}-ev-0`,
      at: evAt,
      kind: "creado",
      actor: requester,
      detail: `${practice === "incidente" ? "Incidente" : "Requerimiento"} registrado desde el portal.`,
    });

    let assignee: string | null = null;
    let resolvedAt: number | null = null;

    if (status !== "nuevo") {
      assignee = pick(rng, [...AGENTS, ME]);
      evAt += rng() * 45 * 60_000 + 300_000;
      events.push({
        id: `${id}-ev-1`,
        at: evAt,
        kind: "asignacion",
        actor: "Sistema",
        to: assignee,
      });
      events.push({
        id: `${id}-ev-2`,
        at: evAt + 60_000,
        kind: "estado",
        actor: assignee,
        from: "nuevo",
        to: "en_progreso",
      });
    }

    const noteCount = status === "nuevo" ? 0 : Math.floor(rng() * 3);
    for (let n = 0; n < noteCount; n++) {
      evAt += rng() * 90 * 60_000;
      events.push({
        id: `${id}-ev-${events.length}`,
        at: evAt,
        kind: "nota",
        actor: assignee ?? requester,
        detail: pick(rng, NOTES),
      });
    }

    if (status === "pendiente_usuario") {
      evAt += rng() * 30 * 60_000;
      events.push({
        id: `${id}-ev-${events.length}`,
        at: evAt,
        kind: "estado",
        actor: assignee ?? AGENTS[0],
        from: "en_progreso",
        to: "pendiente_usuario",
      });
    }

    if (status === "resuelto" || status === "cerrado") {
      const target = SLA_TARGET_MIN[priority] * 60_000;
      const factor = 0.35 + rng() * 1.0;
      evAt = Math.max(
        evAt + 5 * 60_000,
        Math.min(evAt + rng() * 60 * 60_000, createdAt + target * factor),
      );
      resolvedAt = evAt;
      events.push({
        id: `${id}-ev-${events.length}`,
        at: evAt,
        kind: "estado",
        actor: assignee ?? AGENTS[0],
        from: "en_progreso",
        to: "resuelto",
      });
      if (status === "cerrado") {
        evAt += rng() * 6 * 3_600_000;
        events.push({
          id: `${id}-ev-${events.length}`,
          at: evAt,
          kind: "estado",
          actor: requester,
          from: "resuelto",
          to: "cerrado",
        });
      }
    }

    const attachments: Attachment[] = [];
    if (rng() < 0.35) {
      attachments.push(pick(rng, ATTACHMENTS));
      if (rng() < 0.3) {
        const extra = pick(rng, ATTACHMENTS);
        if (extra.name !== attachments[0].name) attachments.push(extra);
      }
      if (attachments.length) {
        events.push({
          id: `${id}-ev-${events.length}`,
          at: createdAt + 120_000,
          kind: "adjunto",
          actor: requester,
          detail: attachments.map((a) => a.name).join(", "),
        });
      }
    }

    tickets.push({
      id,
      practice,
      subject,
      description,
      requester,
      dept,
      priority,
      status,
      assignee,
      createdAt,
      updatedAt: evAt,
      resolvedAt,
      events,
      attachments,
    });
  }

  return tickets.sort((a, b) => b.createdAt - a.createdAt);
}

/** Deltas sintéticos respecto al día anterior (datos de demostración). */
export const KPI_DELTAS = {
  abiertos: 3,
  riesgo: -1,
  mttr: -12,
  cumplimiento: 0.8,
};

/** Volumen de tickets de los últimos 7 días (sintético). */
export const VOLUME_7D = [
  { day: "Lun", count: 18 },
  { day: "Mar", count: 24 },
  { day: "Mié", count: 21 },
  { day: "Jue", count: 27 },
  { day: "Vie", count: 22 },
  { day: "Sáb", count: 8 },
  { day: "Dom", count: 5 },
];

/* ═══════════ Portal de autoservicio (catálogo de servicios, sintético) ═══════════ */

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  estimate: string;
  impact: "alto" | "medio" | "bajo";
}

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    id: "CAT-01",
    name: "Restablecimiento de contraseña",
    description: "Restablece la contraseña de tu cuenta corporativa. Si solo olvidaste la clave, hazlo tú mismo desde «Mi perfil».",
    category: "Accesos",
    estimate: "15 min",
    impact: "medio",
  },
  {
    id: "CAT-02",
    name: "Acceso a carpeta compartida",
    description: "Solicita permisos de lectura o escritura sobre una carpeta de red, con autorización de tu jefe directo.",
    category: "Accesos",
    estimate: "4 h",
    impact: "medio",
  },
  {
    id: "CAT-03",
    name: "VPN para contratista",
    description: "Acceso remoto temporal con MFA para personal externo. Define la fecha de expiración.",
    category: "Accesos",
    estimate: "24 h",
    impact: "alto",
  },
  {
    id: "CAT-04",
    name: "Alta de nuevo empleado",
    description: "Laptop, correo, extensiones y accesos del puesto listos para el primer día. Requiere carta de contratación.",
    category: "Hardware y equipo",
    estimate: "5 días",
    impact: "alto",
  },
  {
    id: "CAT-05",
    name: "Monitor o periférico adicional",
    description: "Segundo monitor, teclado ergonómico o dique de estación. Sujeto a inventario disponible.",
    category: "Hardware y equipo",
    estimate: "72 h",
    impact: "bajo",
  },
  {
    id: "CAT-06",
    name: "Cambio de laptop",
    description: "Renovación de equipo por ciclo de vida (4 años) o por falla recurrente documentada.",
    category: "Hardware y equipo",
    estimate: "5 días",
    impact: "medio",
  },
  {
    id: "CAT-07",
    name: "Licencia de software",
    description: "Adobe, Office Pro o herramientas de analítica aprobadas por tu dirección.",
    category: "Software y licencias",
    estimate: "48 h",
    impact: "medio",
  },
  {
    id: "CAT-08",
    name: "Instalación de software aprobado",
    description: "Instalación remota de software del catálogo aprobado en tu estación de trabajo.",
    category: "Software y licencias",
    estimate: "8 h",
    impact: "bajo",
  },
];

export const CATALOG_CATEGORIES = [
  "Accesos",
  "Hardware y equipo",
  "Software y licencias",
];

/* ═══════════ Datos sintéticos de la Fase 2 (ITIL completo) ═══════════ */

const h = (n: number) => n * 3_600_000;

/** Semilla sintética de problemas — datos de DEMOSTRACIÓN. */
export function seedProblems(now: number): Problem[] {
  return [
    {
      id: "PRB-3001",
      title: "Bloqueos recurrentes de cuentas de dominio",
      description:
        "Cuatro incidentes esta semana con cuentas bloqueadas por intentos fallidos. El patrón se concentra en Finanzas durante el cierre de mes.",
      status: "investigacion",
      causeRaiz:
        "Hipótesis en validación: el asistente de correo del cierre contable guarda la contraseña anterior y reintenta contra el controlador de dominio.",
      workaround: false,
      linkedIncidentIds: ["INC-2400", "INC-2421", "INC-2449"],
      assignee: "Ana Bustamante",
      createdAt: now - h(50),
      updatedAt: now - h(4),
    },
    {
      id: "PRB-3002",
      title: "Degradación de VPN en horario punta",
      description:
        "Usuarios remotos reportan desconexiones entre 8:30 y 9:30. Coincide con el arranque de sesiones en sucursales.",
      status: "investigacion",
      causeRaiz: null,
      workaround: true,
      linkedIncidentIds: ["INC-2407", "INC-2435"],
      assignee: "Gonzalo Herrera",
      createdAt: now - h(38),
      updatedAt: now - h(9),
    },
    {
      id: "PRB-3003",
      title: "Atascos de cola en impresoras del piso 2",
      description:
        "Documentos pesados de PDF encolan y bloquean la impresora compartida del pasillo de Finanzas.",
      status: "resuelto",
      causeRaiz:
        "El controlador antiguo no libera el spooler con archivos > 80 MB; se actualizó el driver y se publicó la KB-103.",
      workaround: false,
      linkedIncidentIds: ["INC-2414", "INC-2470"],
      assignee: "Elena Fonseca",
      createdAt: now - h(120),
      updatedAt: now - h(30),
    },
    {
      id: "PRB-3004",
      title: "Latencia intermitente del CRM en horas de cierre",
      description:
        "Consultas de fichas de cliente tardan más de un minuto entre 17:00 y 18:00.",
      status: "nuevo",
      causeRaiz: null,
      workaround: false,
      linkedIncidentIds: ["INC-2456"],
      assignee: null,
      createdAt: now - h(14),
      updatedAt: now - h(14),
    },
    {
      id: "PRB-3005",
      title: "Fallos de respaldo en noches de mantenimiento",
      description:
        "El trabajo programado de respaldo termina con error 0x8 dos viernes consecutivos.",
      status: "resuelto",
      causeRaiz:
        "La ventana de respaldo colisiona con el reindexado semanal; se reprogramó el reindexado a las 23:00.",
      workaround: false,
      linkedIncidentIds: ["INC-2491"],
      assignee: "Carlos Duarte",
      createdAt: now - h(96),
      updatedAt: now - h(52),
    },
  ];
}

/** Semilla sintética de cambios — datos de DEMOSTRACIÓN. */
export function seedChanges(now: number): Change[] {
  return [
    {
      id: "CHG-4001",
      title: "Actualización de firmware del switch núcleo",
      type: "normal",
      status: "en_revision",
      risk: "alto",
      ventana: "Viernes 22:00 – 23:30",
      description:
        "Actualización a la versión 9.2 del switch núcleo para cerrar la vulnerabilidad CVE de enlace de administración. Se prueban rutas y el plan de reversión queda listo.",
      solicita: "Gonzalo Herrera",
      implementador: "Gonzalo Herrera",
      ciIds: ["CI-1008", "CI-1010"],
      approvals: [
        { role: "Gestor de cambios", state: "aprobado" },
        { role: "CAB — Líder de infraestructura", state: "pendiente" },
        { role: "Implementación", state: "pendiente" },
      ],
      createdAt: now - h(28),
      updatedAt: now - h(6),
    },
    {
      id: "CHG-4002",
      title: "Migración de buzones a Exchange Online — lote 3",
      type: "normal",
      status: "aprobado",
      risk: "medio",
      ventana: "Sábado 02:00 – 06:00",
      description:
        "Tercer lote de migración de buzones (120 usuarios de Ventas y Marketing). Notificación enviada a los afectados.",
      solicita: "Carlos Duarte",
      implementador: "Carlos Duarte",
      ciIds: ["CI-1011", "CI-1012"],
      approvals: [
        { role: "Gestor de cambios", state: "aprobado" },
        { role: "CAB — Líder de infraestructura", state: "aprobado" },
        { role: "Implementación", state: "pendiente" },
      ],
      createdAt: now - h(60),
      updatedAt: now - h(20),
    },
    {
      id: "CHG-4003",
      title: "Reemplazo estándar de laptop con renglón aprobado",
      type: "estandar",
      status: "implementado",
      risk: "bajo",
      ventana: "Inmediata",
      description:
        "Cambio estándar pre-aprobado: reposición de equipo con el mismo modelo y imagen corporativa.",
      solicita: "Ana Bustamante",
      implementador: "Ana Bustamante",
      ciIds: ["CI-1003"],
      approvals: [
        { role: "Gestor de cambios", state: "aprobado" },
        { role: "Implementación", state: "aprobado" },
      ],
      createdAt: now - h(72),
      updatedAt: now - h(40),
    },
    {
      id: "CHG-4004",
      title: "Parche de seguridad crítico del portal de proveedores",
      type: "emergencia",
      status: "implementado",
      risk: "alto",
      ventana: "Emergencia — hoy 14:00",
      description:
        "Parche inmediato por divulgación activa de vulnerabilidad en el portal externo. Aprobación verbal del ECAB documentada en la bitácora.",
      solicita: "Elena Fonseca",
      implementador: "Elena Fonseca",
      ciIds: ["CI-1006", "CI-1008"],
      approvals: [
        { role: "ECAB — Dirección de TI", state: "aprobado" },
        { role: "Implementación", state: "aprobado" },
      ],
      createdAt: now - h(20),
      updatedAt: now - h(12),
    },
    {
      id: "CHG-4005",
      title: "Ampliación de RAM del servidor de BI",
      type: "normal",
      status: "rechazado",
      risk: "medio",
      ventana: "Domingo 03:00 – 05:00",
      description:
        "Paso de 64 a 128 GB para soportar los tableros de cierre. Requiere apagar el nodo principal.",
      solicita: "Carlos Duarte",
      implementador: null,
      ciIds: ["CI-1004"],
      approvals: [
        { role: "Gestor de cambios", state: "aprobado" },
        { role: "CAB — Líder de infraestructura", state: "rechazado" },
        { role: "Implementación", state: "pendiente" },
      ],
      createdAt: now - h(88),
      updatedAt: now - h(64),
    },
  ];
}

/** Semilla sintética de la CMDB — datos de DEMOSTRACIÓN. */
export function seedCis(): ConfigItem[] {
  return [
    {
      id: "CI-1001",
      name: "SRV-DC01 — Directorio activo principal",
      type: "servidor",
      environment: "produccion",
      criticality: "alta",
      owner: "Infraestructura",
      relations: [{ ciId: "CI-1008", kind: "conecta_a" }],
    },
    {
      id: "CI-1002",
      name: "SRV-VPN01 — Puerta de enlace VPN",
      type: "servidor",
      environment: "produccion",
      criticality: "alta",
      owner: "Redes",
      relations: [
        { ciId: "CI-1008", kind: "conecta_a" },
        { ciId: "CI-1009", kind: "conecta_a" },
      ],
    },
    {
      id: "CI-1003",
      name: "EQ-SOPORTE-04 — Estación de soporte",
      type: "estacion",
      environment: "produccion",
      criticality: "baja",
      owner: "Soporte N1",
      relations: [{ ciId: "CI-1008", kind: "conecta_a" }],
    },
    {
      id: "CI-1004",
      name: "SRV-BI01 — Servidor de analítica",
      type: "servidor",
      environment: "produccion",
      criticality: "media",
      owner: "Infraestructura",
      relations: [{ ciId: "CI-1008", kind: "conecta_a" }],
    },
    {
      id: "CI-1005",
      name: "SRV-BKP01 — Servidor de respaldos",
      type: "servidor",
      environment: "produccion",
      criticality: "alta",
      owner: "Infraestructura",
      relations: [
        { ciId: "CI-1008", kind: "conecta_a" },
        { ciId: "CI-1001", kind: "depende_de" },
      ],
    },
    {
      id: "CI-1006",
      name: "SW-PORTAL-PROV — Portal de proveedores",
      type: "aplicacion",
      environment: "produccion",
      criticality: "alta",
      owner: "Desarrollo",
      relations: [{ ciId: "CI-1001", kind: "depende_de" }],
    },
    {
      id: "CI-1007",
      name: "SW-CRM01 — CRM corporativo",
      type: "aplicacion",
      environment: "produccion",
      criticality: "media",
      owner: "Desarrollo",
      relations: [{ ciId: "CI-1004", kind: "se_ejecuta_en" }],
    },
    {
      id: "CI-1008",
      name: "NET-CORE-SW01 — Switch núcleo",
      type: "red",
      environment: "produccion",
      criticality: "alta",
      owner: "Redes",
      relations: [],
    },
    {
      id: "CI-1009",
      name: "NET-WIFI-P2 — Red inalámbrica piso 2",
      type: "red",
      environment: "produccion",
      criticality: "media",
      owner: "Redes",
      relations: [{ ciId: "CI-1008", kind: "conecta_a" }],
    },
    {
      id: "CI-1010",
      name: "EQ-IMP-P2-01 — Impresora piso 2",
      type: "impresora",
      environment: "produccion",
      criticality: "baja",
      owner: "Soporte N1",
      relations: [{ ciId: "CI-1009", kind: "conecta_a" }],
    },
    {
      id: "CI-1011",
      name: "SVC-CORREO — Servicio de correo",
      type: "servicio",
      environment: "produccion",
      criticality: "alta",
      owner: "Infraestructura",
      relations: [{ ciId: "CI-1001", kind: "depende_de" }],
    },
    {
      id: "CI-1012",
      name: "SVC-VPN — Servicio de acceso remoto",
      type: "servicio",
      environment: "produccion",
      criticality: "alta",
      owner: "Redes",
      relations: [{ ciId: "CI-1002", kind: "se_ejecuta_en" }],
    },
  ];
}

/** Asocia tickets del seed a elementos de configuración (sintético). */
export const CI_TICKET_HINTS: Record<string, string[]> = {
  "CI-1002": ["INC-2407", "INC-2435"],
  "CI-1006": ["INC-2484"],
  "CI-1005": ["INC-2491"],
  "CI-1009": ["INC-2477"],
  "CI-1010": ["INC-2414", "INC-2470"],
  "CI-1011": ["INC-2421", "INC-2428"],
  "CI-1007": ["INC-2456"],
  "CI-1001": ["INC-2400", "INC-2449"],
};

/** Semilla sintética de la base de conocimiento — datos de DEMOSTRACIÓN. */
export function seedArticles(now: number): KbArticle[] {
  const d = (days: number) => now - days * 24 * h(1);
  return [
    {
      id: "KB-101",
      title: "Desbloquear tu cuenta de dominio en tres pasos",
      practice: "incidente",
      summary:
        "Si tu cuenta quedó bloqueada por intentos fallidos, puedes desbloquearla tú mismo desde el portal sin llamar a soporte.",
      sections: [
        {
          heading: "Antes de empezar",
          body: "El sistema bloquea la cuenta después de cinco intentos fallidos en diez minutos. Espera dos minutos antes de intentar el desbloqueo; los intentos inmediatos reinician el contador.",
        },
        {
          heading: "Paso a paso",
          body: "Abre el portal de autoservicio y entra con tu número de empleado. En «Mi perfil», elige «Desbloquear cuenta». Confirma con tu teléfono registrado y define una nueva contraseña que cumpla la política: doce caracteres, un número y un símbolo. El desbloqueo aplica en menos de un minuto.",
        },
        {
          heading: "Si el desbloqueo falla",
          body: "Cuando el portal responde «cuenta protegida», es probable que exista un bloqueo administrativo por el cierre de mes. Abre un incidente desde «Reportar problema» y menciona el código PRB-3001; el equipo lo atiende con prioridad P2 durante el cierre.",
        },
      ],
      views: 214,
      helpful: 187,
      updatedAt: d(2),
    },
    {
      id: "KB-102",
      title: "Conectar la VPN corporativa correctamente",
      practice: "incidente",
      summary:
        "Configuración recomendada del cliente VPN y solución al error «verificando» que se queda colgado.",
      sections: [
        {
          heading: "Configuración recomendada",
          body: "Usa el cliente corporativo versión 7.2 o superior. En preferencias, activa «Reconectar automáticamente» y desactiva «Túnel dividido». La puerta de enlace recomendada para la región centro es la número dos.",
        },
        {
          heading: "Si se queda en «verificando»",
          body: "Cierra el cliente por completo (incluido el icono de la bandeja), espera diez segundos y vuelve a abrirlo. Si el problema persiste, cambia a la puerta de enlace tres y conéctate de nuevo. No reinstales el cliente: las credenciales guardadas se pierden.",
        },
        {
          heading: "Horario punta",
          body: "Entre 8:30 y 9:30 la capacidad está al límite. Si no necesitas acceso inmediato, espera a las 9:45; el problema de capacidad está bajo investigación con registro PRB-3002.",
        },
      ],
      views: 342,
      helpful: 289,
      updatedAt: d(5),
    },
    {
      id: "KB-103",
      title: "Resolver atascos en la impresora del piso 2",
      practice: "incidente",
      summary:
        "Cómo liberar la cola de la impresora compartida cuando los documentos pesados la bloquean.",
      sections: [
        {
          heading: "Liberar la cola",
          body: "En el panel de la impresora, entra a «Trabajos» y cancela el documento que muestre más de 80 MB. Los PDF pesados generados por el sistema contable son la causa más frecuente; exporta el reporte en calidad media y vuelve a imprimir.",
        },
        {
          heading: "Atasco físico",
          body: "Abre la puerta frontal, retira el fusor con la manija verde y extrae el papel en dirección de la banda. No tires del papel hacia atrás: rasga y deja restos que atascan la siguiente impresión.",
        },
        {
          heading: "Cuándo abrir un incidente",
          body: "Si el error «atasco en fusora» aparece sin papel visible, abre un incidente: el equipo de soporte actualizó el controlador y puede aplicar la corrección remota documentada en PRB-3003.",
        },
      ],
      views: 156,
      helpful: 118,
      updatedAt: d(9),
    },
    {
      id: "KB-105",
      title: "Solicitar acceso a carpetas compartidas",
      practice: "requerimiento",
      summary:
        "El camino correcto para pedir permisos sobre carpetas de red, sin llamar a la mesa.",
      sections: [
        {
          heading: "Lo que necesitas",
          body: "El identificador de la carpeta (por ejemplo \\\\servidor\\finanzas), el nombre de tu área y la autorización de tu jefe directo. Sin la autorización, la solicitud se devuelve y pierde un día.",
        },
        {
          heading: "Cómo solicitarlo",
          body: "En el catálogo de autoservicio, elige «Accesos» y después «Carpeta compartida». Pega el identificador, elige el nivel (lectura o escritura) y anexa el correo de autorización. El equipo responde en menos de cuatro horas hábiles.",
        },
        {
          heading: "Permisos temporales",
          body: "Para reemplos de vacaciones, marca la casilla «acceso temporal» y define la fecha de expiración; el sistema lo revoca solo y evita auditorías de accesos sobrantes.",
        },
      ],
      views: 98,
      helpful: 76,
      updatedAt: d(12),
    },
    {
      id: "KB-106",
      title: "Checklist de alta de nuevo empleado (TI)",
      practice: "requerimiento",
      summary:
        "Todo lo que debe existir el día uno para que un empleado nuevo trabaje sin fricción.",
      sections: [
        {
          heading: "Siete días antes",
          body: "Registra la solicitud en el catálogo («Alta de nuevo empleado») con la carta de contratación. El equipo reserva laptop, teléfono de extensión y las licencias de software del puesto.",
        },
        {
          heading: "El día uno",
          body: "Entrega del equipo con imagen corporativa, cuenta de correo activa, acceso a la carpeta del área y multi-factor configurado. La persona del área acompaña al empleado los primeros quince minutos.",
        },
        {
          heading: "Verificación final",
          body: "El ticket de alta no se cierra hasta confirmar: inicio de sesión correcto, correo enviando y recibiendo, y acceso a las dos carpetas del puesto. Todo se documenta en la solicitud original.",
        },
      ],
      views: 67,
      helpful: 58,
      updatedAt: d(15),
    },
    {
      id: "KB-107",
      title: "Qué hacer cuando SAP muestra pantalla azul",
      practice: "incidente",
      summary:
        "El error de video al abrir el módulo contable tiene solución remota; no reinstales SAP.",
      sections: [
        {
          heading: "Síntoma",
          body: "Al abrir el módulo de contabilidad, la estación se reinicia con un error de controlador de video. Ocurre en estaciones con el controlador de gráficos de principios del año pasado.",
        },
        {
          heading: "Solución inmediata",
          body: "No pierdes datos: el error ocurre antes de abrir la sesión contable. Abre un incidente con el asunto «pantalla azul al abrir SAP» y el equipo actualiza el controlador por remoto en quince minutos.",
        },
        {
          heading: "Prevención",
          body: "El despliegue del controlador corregido ya está en el cambio programado del mes; las estaciones que lo recibieron ya no presentan el síntoma.",
        },
      ],
      views: 143,
      helpful: 121,
      updatedAt: d(7),
    },
  ];
}
