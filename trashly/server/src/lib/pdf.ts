import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { ProviderError } from "../domain/types.ts";

// Ekstrakcja tekstu z PDF przez `pdftotext` (poppler-utils). Wymagane na serwerze/workerze:
//   apt-get install -y poppler-utils
// Tryb -bbox zwraca współrzędne każdego słowa – parser tabel opiera się na geometrii, nie na spacjach.

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function pdfToBbox(pdf: Uint8Array, timeoutMs = 30_000): Promise<string> {
  if (pdf.length < 5 || String.fromCharCode(...pdf.slice(0, 5)) !== "%PDF-") {
    return Promise.reject(new ProviderError("PARSE_ERROR", "Pobrany plik nie jest dokumentem PDF."));
  }
  const dir = mkdtempSync(join(tmpdir(), "trashly-pdf-"));
  const file = join(dir, "in.pdf");
  writeFileSync(file, pdf);
  return new Promise((resolve, reject) => {
    execFile("pdftotext", ["-bbox", file, "-"], { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      rmSync(dir, { recursive: true, force: true });
      if (err) {
        const missing = (err as NodeJS.ErrnoException).code === "ENOENT";
        reject(new ProviderError("PARSE_ERROR", missing
          ? "Brak narzędzia pdftotext (poppler-utils) na serwerze – nie można przetworzyć PDF."
          : `Nie udało się odczytać PDF: ${err.message}`));
      } else resolve(stdout);
    });
  });
}

/** Wyciąga linki do PDF z HTML strony gminy (względne → bezwzględne). */
export function extractPdfLinks(html: string, baseUrl: string): { url: string; title: string }[] {
  const out = new Map<string, { url: string; title: string }>();
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = new URL(m[1].replace(/&amp;/g, "&"), baseUrl).toString();
    const title = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || decodeURIComponent(url.split("/").pop() ?? "");
    if (!out.has(url)) out.set(url, { url, title });
  }
  return [...out.values()];
}
