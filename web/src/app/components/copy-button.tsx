"use client";

import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium transition-all hover:border-zinc-500 hover:bg-zinc-800 active:scale-95"
    >
      {copied ? "✓ Đã copy" : "Copy link"}
    </button>
  );
}
