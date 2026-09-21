import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isMobileApp } from "../../lib/platform";
import useAuthStore from "../../store/useAuthStore";
import { getDefaultRoute } from "../../lib/authRoutes";
import splashLogo from "../../assets/phil-logo.png";

export default function SplashPage() {
  const navigate = useNavigate();
  const { loading, session, profile } = useAuthStore();
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      const destination = isMobileApp
        ? "/billing"
        : session
          ? getDefaultRoute(profile, session.user)
          : "/login";

      navigate(destination, {
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
            PMW
          </div>
        ) : (
          <img
            src={splashLogo}
            alt="Phil's Metal Works logo"
            className="h-16 w-16 rounded-2xl object-cover shadow-lg"
            onError={() => setLogoFailed(true)}
          />
        )}
      </div>
      <h1 className="text-4xl font-bold text-text-primary tracking-tight">
        Phil's Metal Works
      </h1>
      <p className="text-text-secondary mt-2 text-lg">
        Where metal becomes Art
      </p>
    </div>
  );
}
