import { z } from "zod";
import { JD_TEXT_MAX_LENGTH } from "@/lib/config";

// Best-effort extraction of job data from an HTML page (FR-2.2). Pure functions, no network.
// Order of preference: schema.org JobPosting JSON-LD (used by many job boards), then meta tags, then page text.

export type ParsedJob = {
  companyName: string;
  position: string;
  jdText: string;
};

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Converts an HTML fragment to readable plain text with line breaks kept. */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style|noscript|svg|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ");

  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v\u00a0]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const jobPostingSchema = z
  .object({
    "@type": z.union([z.string(), z.array(z.string())]),
    title: z.string().optional(),
    description: z.string().optional(),
    hiringOrganization: z.union([z.string(), z.object({ name: z.string().optional() }).loose()]).optional(),
  })
  .loose();

type JobPostingLd = z.infer<typeof jobPostingSchema>;

function isJobPosting(value: JobPostingLd): boolean {
  const type = value["@type"];
  return Array.isArray(type) ? type.includes("JobPosting") : type === "JobPosting";
}

function collectCandidates(node: unknown, out: unknown[]): void {
  if (Array.isArray(node)) {
    node.forEach((item) => collectCandidates(item, out));
    return;
  }
  if (node && typeof node === "object") {
    out.push(node);
    if ("@graph" in node) collectCandidates(node["@graph"], out);
  }
}

function findJobPosting(html: string): JobPostingLd | null {
  const scripts = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scripts) {
    let json: unknown;
    try {
      json = JSON.parse(match[1] ?? "");
    } catch {
      continue;
    }
    const candidates: unknown[] = [];
    collectCandidates(json, candidates);
    for (const candidate of candidates) {
      const parsed = jobPostingSchema.safeParse(candidate);
      if (parsed.success && isJobPosting(parsed.data)) return parsed.data;
    }
  }
  return null;
}

function metaContent(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const value = pattern.exec(html)?.[1];
    if (value) return decodeEntities(value).trim();
  }
  return "";
}

function clean(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.slice(0, max);
}

export function parseJobHtml(html: string): ParsedJob {
  const ld = findJobPosting(html);

  const ldCompany =
    typeof ld?.hiringOrganization === "string" ? ld.hiringOrganization : (ld?.hiringOrganization?.name ?? "");

  const titleTag = decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  const position = clean(decodeEntities(ld?.title ?? "") || metaContent(html, "og:title") || titleTag, 200);
  const companyName = clean(decodeEntities(ldCompany) || metaContent(html, "og:site_name"), 200);

  const bodyHtml = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const jdSource = ld?.description ? htmlToText(decodeEntities(ld.description)) : htmlToText(bodyHtml);

  return {
    companyName,
    position,
    jdText: jdSource.slice(0, JD_TEXT_MAX_LENGTH),
  };
}
