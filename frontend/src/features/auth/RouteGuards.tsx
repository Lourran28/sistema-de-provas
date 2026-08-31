import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./useAuth";

export function ProtectedRoute() {
  const { isReady, user } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <SessionLoading />;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isReady, user } = useAuth();

  if (!isReady) {
    return <SessionLoading />;
  }

  return user ? <Navigate replace to="/dashboard" /> : <Outlet />;
}

function SessionLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 text-center text-sm text-slate-500">
      Verificando sua sessão...
    </div>
  );
}
