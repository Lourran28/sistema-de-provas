import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
      <aside className="hidden bg-teal-800 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 bg-white/10">
            <GraduationCap aria-hidden="true" size={24} />
          </span>
          <div>
            <p className="text-base font-semibold">Sistema de Provas</p>
            <p className="mt-0.5 text-sm text-teal-100">Painel do professor</p>
          </div>
        </div>
        <p className="max-w-xs text-2xl font-semibold leading-9 text-white">Sua rotina de avaliações, em ordem.</p>
        <p className="text-sm text-teal-100">Acesse sua conta para continuar.</p>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-12">{children}</main>
    </div>
  );
}
