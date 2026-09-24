import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="text-sm text-navy-300">Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
