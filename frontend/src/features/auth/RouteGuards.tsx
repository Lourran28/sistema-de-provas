import { LoaderCircle } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { SlowServerNotice } from "./SlowServerNotice";
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
      <div className="flex max-w-sm flex-col items-center">
        <LoaderCircle aria-hidden="true" className="mb-3 animate-spin text-teal-700" size={24} />
        <p>Verificando sua sessão...</p>
        <SlowServerNotice className="mt-2 leading-6 text-slate-600" />
      </div>
    </div>
  );
}
