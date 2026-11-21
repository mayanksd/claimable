/** Friendly message, plus the raw upstream error on preview/dev builds (sent as "\n\nDetails: …"). */
export function ErrorText({ text }: { text: string }) {
  const [message, detail] = text.split("\n\nDetails: ");
  return (
    <>
      {message}
      {detail && (
        <span className="mt-1.5 block font-mono text-xs break-words whitespace-pre-wrap opacity-80">Details: {detail}</span>
      )}
    </>
  );
}
