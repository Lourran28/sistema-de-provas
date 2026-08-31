import type { ButtonHTMLAttributes, ElementType } from "react";

import clsx from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ElementType;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, icon: Icon, variant = "primary", children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-teal-700 text-white hover:bg-teal-800",
        variant === "secondary" && "border border-stone-300 bg-white text-slate-700 hover:border-slate-400",
        variant === "ghost" && "text-slate-600 hover:bg-stone-100 hover:text-slate-950",
        variant === "danger" && "bg-rose-700 text-white hover:bg-rose-800",
        className
      )}
      type="button"
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" size={18} /> : null}
      {children}
    </button>
  );
}
