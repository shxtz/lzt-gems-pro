import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

const ProtectedRoute = ({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) => {
  const { user, isAdmin, loading, roleLoading } = useAuth();

  if (loading || (requireAdmin && user && roleLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to={requireAdmin ? "/login" : "/auth"} replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
