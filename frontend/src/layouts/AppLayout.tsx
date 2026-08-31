import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileText,
  FilePlus2,
  Files,
  GraduationCap,
  Home,
  KeyRound,
  ListChecks,
  LibraryBig,
  LogOut,
  Menu,
  ScanLine,
  UserRound,
  UsersRound,
  X
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { Button } from "../components/ui/Button";
import { useAuth } from "../features/auth/useAuth";
import { useApiHealth } from "../hooks/useApiHealth";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/provas", label: "Minhas Provas", icon: Files },
  { to: "/criar-prova", label: "Criar Prova", icon: FilePlus2 },
  { to: "/gerar-prova", label: "Gerar Prova", icon: ClipboardCheck },
  { to: "/conteudos", label: "Meus Conteúdos", icon: LibraryBig },
  { to: "/alunos", label: "Alunos e turmas", icon: UsersRound },
  { to: "/questoes", label: "Banco de Questões", icon: BookOpen },
  { to: "/correcao", label: "Correção", icon: ScanLine },
  { to: "/correcao-em-lote", label: "Correção em lote", icon: Files },
  { to: "/revisar-correcoes", label: "Revisões pendentes", icon: ListChecks },
  { to: "/gabaritos", label: "Gabaritos", icon: KeyRound },
  { to: "/resultados", label: "Resultados", icon: BarChart3 },
  { to: "/boletins", label: "Boletins", icon: FileText },
  { to: "/perfil", label: "Perfil", icon: UserRound }
];

export function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { status, isLoading } = useApiHealth();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-stone-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-stone-200 px-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white">
            <GraduationCap aria-hidden="true" size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold">Provas</p>
            <p className="text-xs text-slate-500">Painel do professor</p>
          </div>
        </div>

        <NavigationLinks />
      </aside>

      <div className="lg:pl-72">
        <header className="app-header sticky top-0 z-20 flex h-16 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
              className="lg:hidden"
              icon={isMobileMenuOpen ? X : Menu}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              variant="ghost"
            />
            <div>
              <p className="text-sm font-semibold">Sistema de Provas</p>
              <p className="hidden text-xs text-slate-500 sm:block">Painel do professor</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              aria-live="polite"
              className="hidden h-9 items-center rounded-lg border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-slate-600 sm:inline-flex"
            >
              {isLoading ? "API verificando" : status === "online" ? "API online" : "API offline"}
            </div>
            <div className="hidden min-w-0 text-right md:block">
              <p className="max-w-40 truncate text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role === "ADMIN" ? "Administrador" : "Professor"}</p>
            </div>
            <Button
              aria-label="Sair da conta"
              className="h-9 w-9 px-0 sm:w-auto sm:px-3"
              icon={LogOut}
              onClick={signOut}
              variant="ghost"
            >
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        {isMobileMenuOpen ? (
          <div className="fixed inset-x-0 top-16 z-20 border-b border-stone-200 bg-white px-3 py-4 shadow-panel lg:hidden">
            <NavigationLinks onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        ) : null}

        <main className="px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavigationLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Menu principal" className="space-y-1 px-3 py-4">
      {navigation.map((item) => (
        <NavLink
          className={({ isActive }) =>
            [
              "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition",
              isActive ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-stone-100 hover:text-slate-950"
            ].join(" ")
          }
          key={item.to}
          onClick={onNavigate}
          to={item.to}
        >
          <item.icon aria-hidden="true" size={18} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
