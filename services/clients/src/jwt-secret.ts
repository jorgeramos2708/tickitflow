/**
 * Obtiene el secret JWT con fail-fast en producción.
 * En desarrollo: warning + secret de desarrollo.
 * En producción: error si no está configurada o es < 32 chars.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET es obligatorio en producción y debe tener al menos 32 caracteres",
    );
  }
  console.warn(
    "[WARN] JWT_SECRET no configurada o < 32 chars — usando secret de desarrollo (NO usar en producción)",
  );
  return "tickitflow-dev-secret-not-for-production";
}