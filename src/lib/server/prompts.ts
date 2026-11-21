import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

const cache = new Map<string, string>();

/** Loads prompts/<name>.md (bundled via outputFileTracingIncludes in next.config.ts). */
export function loadPrompt(name: "extract" | "chat"): string {
  let p = cache.get(name);
  if (!p) {
    p = readFileSync(path.join(process.cwd(), "prompts", `${name}.md`), "utf8");
    cache.set(name, p);
  }
  return p;
}
