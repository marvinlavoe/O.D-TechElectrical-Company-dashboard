import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";

export default function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/dashboard");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center">
      <div className="animate-bounce mb-4">
        <img src="/logo.png" alt="O.D TECH Logo" className="w-16 h-16" />
      </div>
      <h1 className="text-4xl font-bold text-text-primary tracking-tight">
        O.D DASHBOARD
      </h1>
      <p className="text-text-secondary mt-2 text-lg">Electrical Engineering Solutions</p>
    </div>
  );
}
