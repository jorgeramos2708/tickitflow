import { Injectable, OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SettingEntity, smtpSettingsFromRows, type SmtpSettings } from "./setting.entity";
import { encryptSetting, isEncrypted } from "./settings-crypto";

interface EmailNotification {
  routingKey: string;
  code: string | null;
  summary: string;
  audience: string;
}

/**
 * Envía emails para notificaciones críticas vía SMTP.
 * La configuración vive en la tabla settings (editable desde la UI),
 * con fallback a variables de entorno.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: Transporter | null = null;
  private current: SmtpSettings | null = null;

  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingsRepo: Repository<SettingEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  /**
   * Migración perezosa: si smtp.pass quedó en plaintext (pre-cifrado),
   * se re-guarda cifrado. El UPDATE es condicional (solo si SIGUE siendo
   * plaintext) — un PUT concurrente con password nuevo no puede ser
   * revertido por el snapshot stale de esta migración.
   */
  private async migrateLegacyPass(rows: SettingEntity[]): Promise<void> {
    const passRow = rows.find((r) => r.key === "smtp.pass");
    if (!passRow || !passRow.value || isEncrypted(passRow.value)) return;
    // Marca de condición con la que compite un PUT concurrente:
    // solo cifra si el valor en DB sigue siendo el plaintext leído
    await this.settingsRepo.manager.transaction(async (em) => {
      await em.query(
        `UPDATE settings SET value = $1, updated_at = NOW()
          WHERE key = 'smtp.pass' AND value = $2`,
        [encryptSetting(passRow.value), passRow.value],
      );
    });
    console.log("[email] smtp.pass migrado a cifrado en reposo");
  }

  /** Lee la configuración de la tabla settings y reconstruye el transporter. */
  async reload(): Promise<void> {
    let rows: SettingEntity[] = [];
    try {
      rows = await this.settingsRepo.find();
    } catch {
      // Si la tabla no existe aún (primera migración), usar env vars
      this.current = null;
    }

    if (rows.length > 0) {
      // La migración es un write: fuera del try de lectura, con error
      // propio — un fallo aquí jamás deshabilita el SMTP legible
      try {
        await this.migrateLegacyPass(rows);
      } catch (err) {
        console.error(
          "[email] migración de smtp.pass falló (se reintenta en el próximo reload):",
          (err as Error).message,
        );
      }
      const settings = smtpSettingsFromRows(rows);
      if (settings.passStatus === "unreadable") {
        console.error(
          "[email] smtp.pass cifrado no es legible (clave rotada o dato corrupto) — auth deshabilitado; re-ingresa el password en Configuración",
        );
      }
      this.current = settings;
    }

    if (this.current?.enabled && this.current.host) {
      try {
        this.transporter = nodemailer.createTransport({
          host: this.current.host,
          port: this.current.port,
          secure: this.current.secure || this.current.port === 465,
          // Sin pass (limpiado o ilegible) no hay auth: relay sin autenticar
          auth:
            this.current.user && this.current.pass
              ? { user: this.current.user, pass: this.current.pass }
              : undefined,
        });
        console.log(
          `[email] SMTP activo: ${this.current.host}:${this.current.port} → ${this.current.recipients.length} destinatarios`,
        );
      } catch (err) {
        console.error("[email] transporter falló:", (err as Error).message);
        this.transporter = null;
      }
    } else {
      this.transporter = null;
      console.log("[email] SMTP no configurado o desactivado");
    }
  }

  /** Envía un email si el evento es crítico y SMTP está activo. */
  async notify(event: EmailNotification): Promise<void> {
    if (!this.transporter || !this.current?.enabled) return;
    if (this.current.recipients.length === 0) return;

    const criticalKeys = [
      "ticket.created",
      "ticket.assigned",
      "problem.created",
      "change.approved",
      "change.rejected",
      "sla.breach",
      "sla.warning",
    ];
    if (!criticalKeys.includes(event.routingKey)) return;

    const subject = `[TickITFlow] ${event.summary}`;
    try {
      await this.transporter.sendMail({
        from: this.current.from,
        to: this.current.recipients.join(", "),
        subject,
        text: this.renderText(event),
        html: this.renderHtml(event),
      });
      console.log(`[email] enviado: "${subject}"`);
    } catch (err) {
      console.error("[email] fallo al enviar:", (err as Error).message);
    }
  }

  /** Envía un email de prueba con la configuración actual. */
  async sendTest(smtp: SmtpSettings): Promise<boolean> {
    try {
      const testTransporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure || smtp.port === 465,
        auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
      });
      await testTransporter.sendMail({
        from: smtp.from,
        to: smtp.recipients.join(", "),
        subject: "[TickITFlow] Email de prueba",
        text: "Si recibes este mensaje, la configuración SMTP funciona correctamente.",
        html: `<p style="font-family: system-ui; color: #15181e;">Si recibes este mensaje, la configuración SMTP funciona correctamente.</p>`,
      });
      return true;
    } catch (err) {
      console.error("[email] test falló:", (err as Error).message);
      return false;
    }
  }

  /** Escapa HTML para prevenir inyección en emails (phishing desde tickets). */
  private esc(text: string): string {
    return text
      .replace(/&/g, String.fromCharCode(38, 97, 109, 112, 59))
      .replace(/</g, String.fromCharCode(38, 108, 116, 59))
      .replace(/>/g, String.fromCharCode(38, 103, 116, 59))
      .replace(/"/g, String.fromCharCode(38, 113, 117, 111, 116, 59))
      .replace(/'/g, String.fromCharCode(38, 35, 48, 51, 57, 59));
  }

  private renderText(event: EmailNotification): string {
    return [
      `TickITFlow — Notificación`,
      ``,
      `Evento:  ${event.routingKey}`,
      `Ticket:  ${event.code ?? "—"}`,
      `Resumen: ${event.summary}`,
      `Audiencia: ${event.audience}`,
      ``,
      `Ver detalles en https://tickitflow.edrs.xyz`,
    ].join("\n");
  }

  private renderHtml(event: EmailNotification): string {
    return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px; color: #15181e;">
  <div style="border: 1px solid #dcded9; border-radius: 4px; overflow: hidden;">
    <div style="background: #15181e; padding: 14px 20px;">
      <span style="color: #fbfbf9; font-weight: 600; font-size: 15px;">TickITFlow</span>
      <span style="color: #da291c; font-weight: 600; font-size: 15px; margin-left: 6px;">· Notificación</span>
    </div>
    <div style="padding: 20px; background: #fbfbf9;">
      <p style="margin: 0 0 12px; font-size: 14px; color: #3d434d;">${this.esc(event.summary)}</p>
      <table style="font-size: 13px; color: #3d434d; border-spacing: 0 4px;">
        <tr><td style="color: #666d78; padding-right: 12px; white-space: nowrap;">Evento</td><td>${this.esc(event.routingKey)}</td></tr>
        <tr><td style="color: #666d78; padding-right: 12px;">Ticket</td><td style="font-family: monospace;">${this.esc(event.code ?? "—")}</td></tr>
        <tr><td style="color: #666d78; padding-right: 12px;">Audiencia</td><td>${this.esc(event.audience)}</td></tr>
      </table>
      <a href="https://tickitflow.edrs.xyz" style="display: inline-block; margin-top: 16px; background: #da291c; color: #fbfbf9; padding: 8px 16px; border-radius: 3px; text-decoration: none; font-size: 13px; font-weight: 500;">Ver en la consola</a>
    </div>
  </div>
</body>
</html>`;
  }
}
