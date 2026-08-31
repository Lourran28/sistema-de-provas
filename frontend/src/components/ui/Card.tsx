import type { HTMLAttributes } from "react";

import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-lg border border-stone-200 bg-white shadow-panel", className)} {...props} />;
}

