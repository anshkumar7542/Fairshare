import { Navigate } from "react-router-dom";
import { AuthForm } from "./AuthForm";
import { useAuth } from "./AuthProvider";

export function SignupPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <AuthForm mode="signup" />;
}
