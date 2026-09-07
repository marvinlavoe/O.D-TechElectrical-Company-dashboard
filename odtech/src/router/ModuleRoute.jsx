import { Navigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { userHasModuleAccess } from "../lib/authRoutes";

export default function ModuleRoute({ moduleKey, children }) {
  const { session, profile, moduleAccess } = useAuthStore();

  if (!userHasModuleAccess(moduleKey, profile, session?.user, moduleAccess)) {
    return <Navigate to="/dashboard/worker" replace />;
  }

  return children;
}
