import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center text-muted-foreground">
        <span>Loading authentication status…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${location.pathname}`} replace />;
  }

  return <Outlet />;
}
