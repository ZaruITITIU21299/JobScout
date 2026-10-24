import { lookup } from "node:dns/promises";
import { JD_FETCH_MAX_BYTES, JD_FETCH_MAX_REDIRECTS, JD_FETCH_TIMEOUT_MS } from "@/lib/config";
import { isPublicAddress } from "@/lib/jobs/networkGuard";
import { parseJobHtml, type ParsedJob } from "@/lib/jobs/parseJobHtml";

export type FetchJobFailure = "INVALID_URL" | "BLOCKED_HOST" | "UNREACHABLE" | "NOT_HTML" | "TOO_LARGE" | "TIMEOUT";

export type FetchJobResult = { ok: true; job: ParsedJob; finalUrl: string } | { ok: false; reason: FetchJobFailure };

class FetchJobError extends Error {
  constructor(readonly reason: FetchJobFailure) {
    super(reason);
  }
}

async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchJobError("INVALID_URL");
  if (url.username || url.password) throw new FetchJobError("INVALID_URL");
  if (url.port && url.port !== "80" && url.port !== "443") throw new FetchJobError("BLOCKED_HOST");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new FetchJobError("UNREACHABLE");
  }
  if (addresses.length === 0 || !addresses.every((a) => isPublicAddress(a.address))) {
    throw new FetchJobError("BLOCKED_HOST");
  }
}

async function readLimited(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > JD_FETCH_MAX_BYTES) throw new FetchJobError("TOO_LARGE");
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > JD_FETCH_MAX_BYTES) {
      await reader.cancel();
      throw new FetchJobError("TOO_LARGE");
    }
    chunks.push(value);
  }

  const charset = /charset=([\w-]+)/i.exec(response.headers.get("content-type") ?? "")?.[1] ?? "utf-8";
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(bytes);
}

/**
 * Fetches a JD page and extracts job data. Redirects are followed manually so every hop is re-checked.
 * Residual risk: DNS may resolve differently between the check and the request (DNS rebinding).
 */
export async function fetchJobPosting(rawUrl: string): Promise<FetchJobResult> {
  const signal = AbortSignal.timeout(JD_FETCH_TIMEOUT_MS);
  try {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new FetchJobError("INVALID_URL");
    }

    for (let hop = 0; hop <= JD_FETCH_MAX_REDIRECTS; hop++) {
      await assertPublicUrl(url);

      let response: Response;
      try {
        response = await fetch(url, {
          redirect: "manual",
          signal,
          headers: {
            accept: "text/html,application/xhtml+xml",
            "user-agent": "JobScout/0.1 (thesis project; single user-initiated fetch)",
          },
        });
      } catch (error) {
        if (signal.aborted) throw new FetchJobError("TIMEOUT");
        throw error instanceof FetchJobError ? error : new FetchJobError("UNREACHABLE");
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new FetchJobError("UNREACHABLE");
        url = new URL(location, url);
        continue;
      }
      if (!response.ok) throw new FetchJobError("UNREACHABLE");

      const contentType = response.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new FetchJobError("NOT_HTML");

      const html = await readLimited(response);
      return { ok: true, job: parseJobHtml(html), finalUrl: url.toString() };
    }
    throw new FetchJobError("UNREACHABLE");
  } catch (error) {
    if (error instanceof FetchJobError) return { ok: false, reason: error.reason };
    if (signal.aborted) return { ok: false, reason: "TIMEOUT" };
    return { ok: false, reason: "UNREACHABLE" };
  }
}
