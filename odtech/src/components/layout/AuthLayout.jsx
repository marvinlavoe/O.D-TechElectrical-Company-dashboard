import { Navigate, Outlet } from "react-router-dom";
import { Zap } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import { getDefaultRoute } from "../../lib/authRoutes";

export default function AuthLayout() {
  const { loading, session, profile } = useAuthStore();

  if (!loading && session) {
    return <Navigate to={getDefaultRoute(profile, session.user)} replace />;
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-primary">
          <Zap size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary tracking-tight">
          O.D DASHBOARD
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface-card py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-surface-border">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
