import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import { getDefaultRoute } from "../../lib/authRoutes";

export default function SplashPage() {
  const navigate = useNavigate();
  const { loading, session, profile } = useAuthStore();

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      navigate(session ? getDefaultRoute(profile, session.user) : "/login", {
        replace: true,
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [loading, navigate, profile, session]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
      <div className="animate-bounce mb-4">
        <img src="/logo.png" alt="O.D TECH Logo" className="w-16 h-16" />
      </div>
      <h1 className="text-4xl font-bold text-text-primary tracking-tight">
        O.D DASHBOARD
      </h1>
      <p className="text-text-secondary mt-2 text-lg">
        Electrical Engineering Solutions
      </p>
    </div>
  );
}
