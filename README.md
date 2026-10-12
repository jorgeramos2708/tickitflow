# TickITFlow

Sistema de mesa de servicio de TI basado en ITIL con arquitectura de microservicios, React y Docker.

## Qué es

TickITFlow gestiona el ciclo completo de soporte de TI con las seis prácticas ITIL:

| Práctica | Descripción |
|---|---|
| Incidentes | Algo se rompió: se registra, prioriza por matriz ITIL y resuelve contra SLA visible |
| Requerimientos | El catálogo de autoservicio recibe solicitudes ya clasificadas |
| Problemas | Causa raíz de incidentes recurrentes, con investigación y workaround |
| Cambios | Flujo CAB con aprobación por rol: normal, estándar pre-aprobado, emergencia |
| CMDB | Elementos de configuración con relaciones tipadas y tickets ligados |
| Base de conocimiento | Soluciones documentadas disponibles para agentes y usuarios |

## Ejecución

### Con nginx (producción, detrás de Cloudflare)

El nginx del host (en `tickit_net`) rutea `tickitflow.edrs.xyz` a los servicios. Los servicios se conectan a `tickit_net` automáticamente.

```bash
# En el servidor (después de agregar el bloque al nginx.conf del host):
cd /opt/tickitflow
docker compose up -d --build
```

### Despliegue independiente (Traefik con certificados manuales)

Para infraestructura Sin nginx ni Cloudflare:

```bash
# Coloca los certificados
mkdir -p certs
cp tu-certificado.crt certs/tickitflow.edrs.xyz.crt
cp tu-llave.key certs/tickitflow.edrs.xyz.key

# Levanta con Traefik como gateway (HTTP → HTTPS redirect automático)
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build
```

### Desarrollo local

```bash
# Crear la red externa si no existe
docker network create tickit_net

# Levantar sin gateway (los servicios quedan en tickit_net)
docker compose up -d --build

# O con Traefik standalone para probar el gateway completo
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build
```

### URLs

| Entorno | URL |
|---|---|
| Producción | https://tickitflow.edrs.xyz |
| Portal | `/portal` |
| Landing | `/landing` |
| RabbitMQ | `:15672` (tickit/tickit) |
| Prometheus | `:9090` |
| Grafana | `:3000` (tickit/tickit) |
| Swagger | `/api/auth/api/docs`, `/api/incidents/api/docs`, etc. |

### Cuentas de demostración

Todas usan la contraseña `demo1234`:

| Cuenta | Rol | Acceso |
|---|---|---|
| `agente@tickitflow.dev` | agente | Consola + portal |
| `usuario@tickitflow.dev` | usuario | Solo portal |
| `admin@tickitflow.dev` | admin | Consola + portal + gestión de usuarios |

## Arquitectura

```
                    ┌──────────────┐
   Usuarios ──────▶ │ Traefik      │ ──── Rate limiting
                    │   gateway    │ ──── TLS (prod)
                    └──────┬───────┘
                           │
         ┌─────────┬───────┼───────┬─────────┐
         ▼         ▼       ▼       ▼         ▼
    ┌───────┐ ┌────────┐ ┌─────┐ ┌──────┐ ┌──────────┐
    │ auth  │ │incidents│ │prob.│ │chang.│ │ cmdb  kb │
    │ :4001 │ │  :4003  │ │:4005│ │:4006 │ │:4007 :4008│
    └───┬───┘ └───┬────┘ └──┬──┘ └───┬──┘ └──┬────┬───┘
        │         │         │        │       │    │
    ┌───▼───┐ ┌───▼────┐ ┌─▼──┐ ┌───▼──┐ ┌──▼┐ ┌─▼──┐
    │  PG   │ │   PG   │ │ PG │ │  PG  │ │PG │ │ PG │
    └───────┘ └────────┘ └────┘ └──────┘ └───┘ └────┘

                    ┌──────────────┐
                    │   RabbitMQ   │ ◀── topic: itil.events
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐     ┌──────────┐
                    │notifications │────▶│Prometheus│
                    │    :4009     │     │  :9090   │
                    └──────────────┘     └────┬─────┘
                                              │
                                         ┌────▼─────┐
                                         │ Grafana  │
                                         │  :3000   │
                                         └──────────┘
```

### Microservicios

| Servicio | Puerto | Base de datos | Función |
|---|---|---|---|
| auth | 4001 | PostgreSQL | JWT, roles, gestión de usuarios |
| incidents | 4003 | PostgreSQL | CRUD de tickets, eventos, series históricas, métricas |
| problems | 4005 | PostgreSQL | RCA, estados, incidentes ligados |
| changes | 4006 | PostgreSQL | Flujo CAB, aprobaciones por rol |
| cmdb | 4007 | PostgreSQL | Elementos de configuración con relaciones |
| kb | 4008 | PostgreSQL | Artículos de conocimiento, voto útil |
| notifications | 4009 | PostgreSQL | Consumidor del bus, feed por rol, SSE |

### Frontend

React + Vite + Tailwind v4 + shadcn/ui, con tres superficies:
- **Consola de agentes** (`/`): dashboard, colas, detalle, reportes, CMDB, KB, problemas, cambios
- **Portal de autoservicio** (`/portal`): catálogo, reportar incidentes, mis tickets
- **Landing** (`/landing`): presentación pública

## Pruebas

```bash
# Backend (Jest en cada servicio)
cd services/auth && npm test
cd services/incidents && npm test
# ... etc para cada servicio

# Frontend (vitest)
cd frontend && npm run test

# E2E del stack (requiere docker compose up)
node scripts/e2e-smoke.mjs
```

Total: 30 tests backend + 21 frontend + 18 smoke E2E = **69 verificaciones**.

## Producción

### Con nginx (arquitectura actual)

```
nginx (tickit_net) → auth:4001, incidents:4003, ..., frontend:80
```

El nginx.conf del host tiene el bloque `tickitflow.edrs.xyz` que rutea cada `/api/<servicio>/*` al microservicio correspondiente (con `handle_path` que strip el prefijo).

### Con Traefik independiente

```
Internet → Traefik :443 (certificados manuales) → servicios
```

El override `docker-compose.traefik.yml` agrega el gateway Traefik con:
- Redirect HTTP :80 → HTTPS :443
- Certificados montados desde `certs/`
- Rutas con `stripPrefix` (equivalente a stripPrefix de nginx)

### Requisitos del servidor

- Docker + Docker Compose
- Red `tickit_net` existente (o crearla con `docker network create tickit_net`)
- DNS: `tickitflow.edrs.xyz` → IP del servidor (vía Cloudflare)

## CI/CD

El workflow de GitHub Actions corre en cada push:
1. Build + test de cada microservicio (matrix)
2. Build + test del frontend
3. E2E del stack completo con Docker Compose
4. Publish opcional (requiere `DOCKERHUB_USERNAME` y `DOCKERHUB_TOKEN` en secrets)
