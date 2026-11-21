// Vercel rejects request bodies over ~4.5 MB, so the whole upload must stay under that.
export const MAX_PDF_BYTES = 4 * 1024 * 1024;
export const MAX_SCREENS = 3;
export const MAX_UPLOAD_BYTES = 4.4 * 1024 * 1024;

export const MAX_PDF_LABEL = "4 MB";

export const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Human size for file chips: "84 KB", "1.2 MB". */
export const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : mb(bytes));
