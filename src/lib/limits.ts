// Vercel rejects request bodies over ~4.5 MB, so the whole upload must stay under that.
export const MAX_PDF_BYTES = 4 * 1024 * 1024;
export const MAX_SCREENS = 3;
export const MAX_UPLOAD_BYTES = 4.4 * 1024 * 1024;

export const MAX_PDF_LABEL = "4 MB";

// Rounded up so a file just over the limit never reads "4.0 MB".
export const mb = (bytes: number) => `${(Math.ceil((bytes / 1024 / 1024) * 10) / 10).toFixed(1)} MB`;

export const LIMIT_HINT = `Upload the full policy PDF, including the first pages (your schedule). PDF up to ${MAX_PDF_LABEL}.`;

export const pdfTooBigMessage = (bytes: number) =>
  `This PDF is ${mb(bytes)}. Please upload a file under ${MAX_PDF_LABEL} — tip: upload just the policy schedule / benefits pages, or compress it at ilovepdf.com.`;

export const SCANNED_PDF_MESSAGE =
  "This looks like a scanned PDF. Please upload the digital copy from your insurer's email or app.";

/** Human size for file chips: "84 KB", "1.2 MB". */
export const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : mb(bytes));
