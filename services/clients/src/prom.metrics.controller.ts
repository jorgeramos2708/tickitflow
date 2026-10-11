import { Controller, Get, Header, Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import client from "prom-client";
import type { Request, Response } from "express";
import { Observable } from "rxjs";

export const httpRequests = new client.Counter({
  name: "tickitflow_http_requests_total",
  help: "Peticiones HTTP recibidas, por ruta y código de respuesta",
  labelNames: ["route", "code"],
});

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const route = (req.route?.path as string | undefined) ?? "unmatched";
      res.on("finish", () => {
      httpRequests.inc({ route, code: String(res.statusCode) });
    });
    return next.handle();
  }
}

/** Métricas Prometheus del servicio — públicas, para scraping interno. */
@Controller("metrics")
export class PromMetricsController {
  constructor() {
    client.collectDefaultMetrics();
  }

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async metrics(): Promise<string> {
    return client.register.metrics();
  }
}
