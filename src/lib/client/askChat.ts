"use client";

/** Lets any card ask the chat a question ("How do I claim this?") without prop drilling. */
export const ASK_EVENT = "claimable:ask";

export const claimQuestion = (perkName: string) => `How do I claim: ${perkName}?`;

export function askChat(question: string) {
  window.dispatchEvent(new CustomEvent<string>(ASK_EVENT, { detail: question }));
}
