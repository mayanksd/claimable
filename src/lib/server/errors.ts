import "server-only";
import { APICallError, NoObjectGeneratedError } from "ai";

/** Show raw error text to the user only on preview / dev builds (never on production). */
export const showErrorDetail = () =>
  process.env.SHOW_ERROR_DETAILS === "1" ||
  process.env.VERCEL_ENV === "preview" ||
  process.env.VERCEL_ENV === "development" ||
  process.env.NODE_ENV !== "production";

/** One readable line describing an upstream / extraction failure: status, API message, request id. */
export function describeError(err: unknown): string {
  if (APICallError.isInstance(err)) {
    let apiMessage = err.message;
    try {
      const body = JSON.parse(err.responseBody ?? "") as { error?: { type?: string; message?: string }; request_id?: string };
      if (body.error?.message) apiMessage = `${body.error.type ?? "error"}: ${body.error.message}`;
      if (body.request_id) apiMessage += ` (request ${body.request_id})`;
    } catch {
      if (err.responseBody) apiMessage += ` — ${err.responseBody.slice(0, 300)}`;
    }
    return `Anthropic API ${err.statusCode ?? "?"}: ${apiMessage}`;
  }
  if (NoObjectGeneratedError.isInstance(err)) {
    const cause = err.cause instanceof Error ? ` — ${err.cause.message.slice(0, 300)}` : "";
    return `No valid object generated (finish: ${err.finishReason ?? "?"})${cause}`;
  }
  if (err instanceof Error) return `${err.name}: ${err.message.slice(0, 400)}`;
  return String(err).slice(0, 400);
}

export const statusOf = (err: unknown) => (APICallError.isInstance(err) ? err.statusCode : undefined);
