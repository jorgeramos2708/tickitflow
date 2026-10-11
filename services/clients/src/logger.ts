import pino from "pino";

/** Logger JSON estructurado — Docker lo recolecta; Grafana/Loki pueden consumirlo. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: process.env.SERVICE_NAME ?? "tickitflow" },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label: string) => ({ level: label }),
  },
});