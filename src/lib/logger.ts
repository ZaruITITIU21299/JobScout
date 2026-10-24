// Structured server-side logging. Log ids, codes and metrics only: never CV/JD text, emails, or secrets.

type LogMeta = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", event: string, meta: LogMeta = {}) {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, meta?: LogMeta) => write("info", event, meta),
  warn: (event: string, meta?: LogMeta) => write("warn", event, meta),
  error: (event: string, meta?: LogMeta) => write("error", event, meta),
};
