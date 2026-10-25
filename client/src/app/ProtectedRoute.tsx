import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-muted">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
