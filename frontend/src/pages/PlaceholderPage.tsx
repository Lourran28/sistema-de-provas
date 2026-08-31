import { Construction } from "lucide-react";

import { Card } from "../components/ui/Card";

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">Nenhum registro disponível.</p>
      </section>

      <Card className="p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <Construction aria-hidden="true" size={22} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-950">Sem dados</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
          Esta seção receberá dados quando os fluxos correspondentes forem cadastrados.
        </p>
      </Card>
    </div>
  );
}
