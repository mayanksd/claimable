import { anthropic } from "@ai-sdk/anthropic";

/** Change the model in one place. */
export const MODEL = "claude-sonnet-5-5";
export const model = anthropic(MODEL);
