import { Navigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import LoadingSpinner from "../components/ui/LoadingSpinner";

export default function ProtectedRoute({ children }) {
  // DEV BYPASS: allow access without login for faster testing
  return children;

  // Uncomment below in production / if auth required
  // const { session, loading } = useAuthStore()
  // if (loading) {
  //   return (
  //     <div className="h-screen flex items-center justify-center bg-surface">
  //       <LoadingSpinner size="lg" />
  //     </div>
  //   )
  // }
  // return session ? children : <Navigate to="/login" replace />
}
