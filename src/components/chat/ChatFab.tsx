"use client";

import { useEffect, useState } from "react";

/** Phones only: the chat sits below the dashboard, so offer a floating way to reach it. */
export function ChatFab() {
  const [chatVisible, setChatVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById("chat");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setChatVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  if (chatVisible) return null;
  return (
    <button
      type="button"
      onClick={() => document.getElementById("chat")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className="fixed right-4 bottom-4 z-30 flex min-h-12 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-2 px-5 text-base font-bold text-white shadow-xl shadow-brand/30 transition-transform hover:-translate-y-0.5 motion-reduce:transform-none lg:hidden"
    >
      <span aria-hidden>💬</span> Talk to your policy
    </button>
  );
}
