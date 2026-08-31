import katex from "katex";
import { useMemo } from "react";

import "katex/dist/katex.min.css";

type MathTextProps = {
  text: string;
  className?: string;
};

type Segment =
  | { type: "text"; content: string }
  | { type: "math"; content: string; displayMode: boolean };

export function MathText({ text, className }: MathTextProps) {
  const segments = useMemo(() => parseMathSegments(text), [text]);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={index}>{segment.content}</span>;
        }

        try {
          const html = katex.renderToString(segment.content, {
            throwOnError: false,
            displayMode: segment.displayMode
          });
          return (
            <span
              dangerouslySetInnerHTML={{ __html: html }}
              key={index}
              style={{ display: segment.displayMode ? "block" : "inline-block" }}
            />
          );
        } catch {
          return (
            <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-xs" key={index}>
              {segment.content}
            </code>
          );
        }
      })}
    </span>
  );
}

function parseMathSegments(input: string): Segment[] {
  if (!input) {
    return [];
  }

  const segments: Segment[] = [];
  // Match $$...$$ for display math and $...$ for inline math
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: input.substring(lastIndex, match.index)
      });
    }

    const raw = match[0];
    if (raw.startsWith("$$") && raw.endsWith("$$")) {
      segments.push({
        type: "math",
        content: raw.slice(2, -2).trim(),
        displayMode: true
      });
    } else if (raw.startsWith("$") && raw.endsWith("$")) {
      segments.push({
        type: "math",
        content: raw.slice(1, -1).trim(),
        displayMode: false
      });
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < input.length) {
    segments.push({
      type: "text",
      content: input.substring(lastIndex)
    });
  }

  return segments;
}
