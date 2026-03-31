import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import splashImg from "../../assets/splash.jpg";

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
      <div className="animate-pulse mb-8 overflow-hidden rounded-2xl shadow-xl w-32 h-32 md:w-48 md:h-48 border-4 border-primary/20">
        <img src={splashImg} alt="O.D TECH Splash" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-4xl font-bold text-text-primary tracking-tight">
        O.D DASHBOARD
      </h1>
      <p className="text-text-secondary mt-2 text-lg">Electrical Engineering Solutions</p>
    </div>
  );
}
