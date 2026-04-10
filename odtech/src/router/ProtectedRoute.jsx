import { Navigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return session ? children : <Navigate to="/login" replace />
}
