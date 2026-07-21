import fs from "node:fs";
import path from "node:path";

export function loadProductionEnv() {
  const envPath = path.join(process.cwd(), ".env.production.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+)=(.*)$/);
    if (!match) continue;
    const name = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[name]) {
      process.env[name] = value;
    }
  }
}

export function redactUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const database = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}/${database}`;
  } catch {
    return "unparseable-url";
  }
}

export function safeId(value) {
  if (!value) return null;
  return value.length <= 12
    ? value
    : `${value.slice(0, 6)}...${value.slice(-4)}`;
}
