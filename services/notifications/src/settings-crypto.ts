import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getJwtSecret } from "./jwt-secret";

/**
 * Cifra valores sensibles de la tabla settings en reposo (AES-256-GCM).
 *
 * Dos claves, versionadas por prefijo del sobre:
 *  - `enc:v1:` — derivada de JWT_SECRET (legado; la rotación del JWT
 *    la invalida, por eso existe v2)
 *  - `enc:v2:` — derivada de SETTINGS_SECRET (variable dedicada;
 *    decouples la rotación de credenciales de auth del cifrado en reposo)
 *
 * Si SETTINGS_SECRET está configurada, todo cifrado NUEVO usa v2.
 * El descifrado elige clave por prefijo: los sobres v1 legibles
 * siguen funcionando tras activar v2.
 */

const PREFIX_V1 = "enc:v1:";
const PREFIX_V2 = "enc:v2:";

function getSettingsSecret(): string | undefined {
  const s = process.env.SETTINGS_SECRET;
  return s && s.length >= 32 ? s : undefined;
}

function deriveKey(secret: string, context: string): Buffer {
  // sha256(secret + contexto) — determinista entre reinicios
  return createHash("sha256")
    .update(`${secret}:${context}`)
    .digest();
}

function currentContext(): string {
  return getSettingsSecret() ? "settings-crypto-v2" : "settings-crypto-v1";
}

function keyFor(prefix: string): Buffer {
  if (prefix === PREFIX_V2) {
    const secret = getSettingsSecret();
    if (!secret) {
      throw new Error("SETTINGS_SECRET es obligatoria para descifrar sobres v2");
    }
    return deriveKey(secret, "settings-crypto-v2");
  }
  return deriveKey(getJwtSecret(), "settings-crypto-v1");
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX_V1) || value.startsWith(PREFIX_V2);
}

export function encryptSetting(value: string): string {
  const secret = getSettingsSecret();
  const prefix = secret ? PREFIX_V2 : PREFIX_V1;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor(prefix), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${prefix}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

/** Resultado del descifrado: valor o señal explícita de fallo. */
export type DecryptResult =
  | { ok: true; value: string }
  | { ok: false; reason: "unreadable" };

/**
 * Descifra un sobre. `plaintext` = valor legado sin cifrar (válido).
 * `unreadable` = clave rotada o dato corrupto — el llamador decide cómo
 * surfaced el error; NUNCA se devuelve el ciphertext como password.
 */
export function decryptSettingEx(value: string): DecryptResult {
  if (!isEncrypted(value)) return { ok: true, value };
  let prefix = "";
  if (value.startsWith(PREFIX_V2)) prefix = PREFIX_V2;
  else if (value.startsWith(PREFIX_V1)) prefix = PREFIX_V1;
  try {
    const [ivB64, tagB64, dataB64] = value.slice(prefix.length).split(":");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      keyFor(prefix),
      Buffer.from(ivB64, "base64"),
      // Tag de 16 bytes fijo: sin esto, un tag truncado podría verificarse
      { authTagLength: 16 },
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return {
      ok: true,
      value: Buffer.concat([
        decipher.update(Buffer.from(dataB64, "base64")),
        decipher.final(),
      ]).toString("utf8"),
    };
  } catch {
    console.error(
      "[settings-crypto] fallo al descifrar valor cifrado — clave cambiada o dato corrupto",
    );
    return { ok: false, reason: "unreadable" };
  }
}

/** Compatibilidad: descifra o devuelve "" en fallo (contrato del M13). */
export function decryptSetting(value: string): string {
  const r = decryptSettingEx(value);
  return r.ok ? r.value : "";
}
