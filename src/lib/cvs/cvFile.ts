import { CV_MAX_BYTES, CV_MIME_TYPES } from "@/lib/config";

export type CvKind = keyof typeof CV_MIME_TYPES;

export type CvFileCheck =
  | { ok: true; kind: CvKind; mimeType: (typeof CV_MIME_TYPES)[CvKind] }
  | { ok: false; message: string };

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04]; // DOCX is a ZIP container

/** Bytes the caller must pass as `head`; readers accept a PDF header anywhere in the first 1024 bytes. */
export const CV_HEAD_BYTES = 1024;

function startsWith(bytes: Uint8Array, magic: number[], offset = 0) {
  return magic.every((byte, i) => bytes[offset + i] === byte);
}

function hasPdfHeader(head: Uint8Array) {
  for (let offset = 0; offset + PDF_MAGIC.length <= head.length; offset++) {
    if (startsWith(head, PDF_MAGIC, offset)) return true;
  }
  return false;
}

/**
 * Decides the CV type from the file's first bytes plus its extension, never from the
 * browser-supplied MIME type, which the client controls.
 */
export function checkCvFile(fileName: string, size: number, head: Uint8Array): CvFileCheck {
  if (size === 0) return { ok: false, message: "The file is empty." };
  if (size > CV_MAX_BYTES) {
    return { ok: false, message: `The file is too large (max ${Math.round(CV_MAX_BYTES / 1024 / 1024)} MB).` };
  }

  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "pdf" && hasPdfHeader(head)) {
    return { ok: true, kind: "pdf", mimeType: CV_MIME_TYPES.pdf };
  }
  if (extension === "docx" && startsWith(head, ZIP_MAGIC)) {
    return { ok: true, kind: "docx", mimeType: CV_MIME_TYPES.docx };
  }
  return { ok: false, message: "Upload a PDF or DOCX file." };
}

/** Keeps the original name for display and download, without path parts or control characters. */
export function safeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "cv";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return (cleaned || "cv").slice(0, 200);
}
