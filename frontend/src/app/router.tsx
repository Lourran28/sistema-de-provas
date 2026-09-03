import { createBrowserRouter, Navigate } from "react-router-dom";
import { createElement, lazy, type ComponentType, Suspense } from "react";

import { ProtectedRoute, PublicOnlyRoute } from "../features/auth/RouteGuards";
import { AppLayout } from "../layouts/AppLayout";

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: lazyPage(async () => ({ default: (await import("../pages/LoginPage")).LoginPage })) },
      { path: "/cadastro", element: lazyPage(async () => ({ default: (await import("../pages/RegisterPage")).RegisterPage })) },
      { path: "/esqueci-senha", element: lazyPage(async () => ({ default: (await import("../pages/ForgotPasswordPage")).ForgotPasswordPage })) },
      { path: "/redefinir-senha", element: lazyPage(async () => ({ default: (await import("../pages/ResetPasswordPage")).ResetPasswordPage })) }
    ]
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/imprimir/versoes/:versionId", element: lazyPage(async () => ({ default: (await import("../pages/PrintVersionPage")).PrintVersionPage })) },
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate replace to="/dashboard" /> },
          { path: "dashboard", element: lazyPage(async () => ({ default: (await import("../pages/DashboardPage")).DashboardPage })) },
          { path: "conteudos", element: lazyPage(async () => ({ default: (await import("../pages/ContentsPage")).ContentsPage })) },
          { path: "alunos", element: lazyPage(async () => ({ default: (await import("../pages/StudentsPage")).StudentsPage })) },
          { path: "provas", element: lazyPage(async () => ({ default: (await import("../pages/ExamsPage")).ExamsPage })) },
          { path: "provas/:examId", element: lazyPage(async () => ({ default: (await import("../pages/ExamReviewPage")).ExamReviewPage })) },
          { path: "criar-prova", element: lazyPage(async () => ({ default: (await import("../pages/CreateExamPage")).CreateExamPage })) },
          { path: "gerar-prova", element: lazyPage(async () => ({ default: (await import("../pages/GenerateExamPage")).GenerateExamPage })) },
          { path: "questoes", element: lazyPage(async () => ({ default: (await import("../pages/QuestionsPage")).QuestionsPage })) },
          { path: "correcao", element: lazyPage(async () => ({ default: (await import("../pages/CorrectionPage")).CorrectionPage })) },
          { path: "correcao-em-lote", element: lazyPage(async () => ({ default: (await import("../pages/BatchCorrectionPage")).BatchCorrectionPage })) },
          { path: "revisar-correcoes", element: lazyPage(async () => ({ default: (await import("../pages/CorrectionReviewPage")).CorrectionReviewPage })) },
          { path: "gabaritos", element: lazyPage(async () => ({ default: (await import("../pages/AnswerKeysPage")).AnswerKeysPage })) },
          { path: "resultados", element: lazyPage(async () => ({ default: (await import("../pages/ResultsPage")).ResultsPage })) },
          { path: "boletins", element: lazyPage(async () => ({ default: (await import("../pages/StudentReportsPage")).StudentReportsPage })) },
          { path: "perfil", element: lazyPage(async () => ({ default: (await import("../pages/ProfilePage")).ProfilePage })) }
        ]
      }
    ]
  },
  { path: "*", element: <Navigate replace to="/dashboard" /> }
]);

function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  const page = lazy(loader);
  return (
    <Suspense fallback={<div className="flex min-h-48 items-center justify-center text-sm text-slate-500">Carregando...</div>}>
      {createElement(page)}
    </Suspense>
  );
}
