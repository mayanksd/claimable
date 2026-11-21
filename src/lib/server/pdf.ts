import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

/** Text of every page, each prefixed with a [[PAGE n]] marker the model must cite. */
export async function pdfToMarkedText(data: Uint8Array): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(data);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const marked = (text as string[]).map((t, i) => `[[PAGE ${i + 1}]]\n${t.trim()}`).join("\n\n");
  return { text: marked, pages: totalPages };
}
