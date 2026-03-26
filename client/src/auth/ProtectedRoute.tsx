import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}
