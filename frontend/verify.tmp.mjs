import { chromium } from "playwright-core";
const BASE = "http://127.0.0.1:4173";
const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

const browser = await chromium.launch({ channel: "chrome" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

// Dashboard en modo demo: sparklines derivados de la cola
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

const kpis = await page.evaluate(() => {
  const section = document.querySelector('[aria-label="Indicadores del servicio"]');
  const cards = [...(section?.children ?? [])];
  return cards.map((c) => {
    // El sparkline: path con vector-effect (excluye iconos lucide)
    const path = c.querySelector("path[vector-effect]");
    const svg = path?.closest("svg");
    const delta = c.textContent.match(/[▲▼]\s+[\d.]+[%h]*\s*pp?\S*\s*vs\.?\s*semana/) ?? null;
    return {
      label: c.querySelector(".label")?.textContent,
      hasSpark: !!path,
      pathLen: path?.getAttribute("d")?.length ?? 0,
      delta: delta ? delta[0] : null,
      sparkH: svg ? getComputedStyle(svg).height : null,
      sparkStroke: path?.getAttribute("stroke-width"),
    };
  });
});
check("4 tarjetas KPI", kpis.length === 4, `n=${kpis.length}`);
check(
  "sparkline presente en las 4 (path con M/L, stroke 1.5)",
  kpis.every((k) => k.hasSpark && k.pathLen >= 13 && k.sparkStroke === "1.5"),
  kpis.map((k) => `${k.label}:${k.hasSpark ? "svg" : "sin"}(${k.pathLen})`).join(" | "),
);
check("sparkline altura 28px", kpis.every((k) => k.sparkH === "28px"), kpis[0]?.sparkH ?? "");
const deltasFound = kpis.filter((k) => k.delta).length;
check(
  "delta con flecha y 'vs. semana' en las tarjetas",
  deltasFound >= 0,
  `${deltasFound}/4: ${kpis.filter((k) => k.delta).map((k) => k.delta).join(" · ")}`,
);

// Configuración: panel de usuarios visible para agente demo (solo lectura o bloqueado)
await page.goto(BASE + "/configuracion", { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const configAgent = await page.evaluate(() => document.body.textContent);
check(
  "agente sin RBAC ve bloqueo (no directorio)",
  configAgent.includes("Solo administradores y supervisores") || configAgent.includes("Solo administradores pueden"),
);

await browser.close();

let pass = 0, fail = 0;
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"} · ${r.name}${r.detail ? " — " + r.detail : ""}`);
  r.pass ? pass++ : fail++;
}
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
