import { BookOpen, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

type ExamCreationModeSwitchProps = {
  mode: "manual" | "generated";
};

export function ExamCreationModeSwitch({ mode }: ExamCreationModeSwitchProps) {
  return (
    <section aria-labelledby="exam-creation-mode-title" className="border-y border-stone-200 py-4">
      <h2 className="text-sm font-semibold text-slate-950" id="exam-creation-mode-title">
        Como montar esta prova?
      </h2>
      <nav aria-label="Modo de criação da prova" className="mt-3 grid gap-2 sm:grid-cols-2">
        <NavLink
          aria-current={mode === "manual" ? "page" : undefined}
          className={({ isActive }) =>
            [
              "flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
              isActive ? "border-teal-700 bg-teal-50 text-teal-950" : "border-stone-300 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/50"
            ].join(" ")
          }
          to="/criar-prova"
        >
          <BookOpen aria-hidden="true" className="shrink-0" size={20} />
          <span>
            <span className="block text-sm font-semibold">Banco de questões</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">Escolha as questões já salvas.</span>
          </span>
        </NavLink>
        <NavLink
          aria-current={mode === "generated" ? "page" : undefined}
          className={({ isActive }) =>
            [
              "flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
              isActive ? "border-teal-700 bg-teal-50 text-teal-950" : "border-stone-300 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/50"
            ].join(" ")
          }
          to="/gerar-prova"
        >
          <Sparkles aria-hidden="true" className="shrink-0" size={20} />
          <span>
            <span className="block text-sm font-semibold">Gerar por conteúdo</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">Crie um rascunho automático para revisar.</span>
          </span>
        </NavLink>
      </nav>
    </section>
  );
}
