// /components/api-docs/CodeBlock.tsx

"use client";

import { useState } from "react";

type Props = {
  code: string;
  language?: string;
};

export default function CodeBlock({ code }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-gray-900 text-gray-100 rounded-xl p-4 text-sm overflow-x-auto">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600"
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}