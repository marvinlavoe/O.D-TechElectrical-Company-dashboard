import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import { getDefaultRoute } from "../../lib/authRoutes";
import splashLogo from "../../assets/splash.jpg";

export default function SplashPage() {
  const navigate = useNavigate();
  const { loading, session, profile } = useAuthStore();
  const [logoFailed, setLogoFailed] = useState(false);

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
        {logoFailed ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white shadow-lg">
            OD
          </div>
        ) : (
          <img
            src={splashLogo}
            alt="O.D TECH Logo"
            className="h-16 w-16 rounded-2xl object-cover shadow-lg"
            onError={() => setLogoFailed(true)}
          />
        )}
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
