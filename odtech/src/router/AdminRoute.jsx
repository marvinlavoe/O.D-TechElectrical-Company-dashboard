import { Navigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { getUserRole } from "../lib/authRoutes";

export default function AdminRoute({ children }) {
  const { session, profile } = useAuthStore();
  const role = getUserRole(profile, session?.user);

  if (role !== "admin") {
    return <Navigate to="/dashboard/worker" replace />;
  }

  return children;
}
