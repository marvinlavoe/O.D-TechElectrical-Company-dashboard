import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import useSidebarStore from "../../store/useSidebarStore";
import { isMobileApp } from "../../lib/platform";
import { formatTrialRemaining, getTrialStatus } from "../../lib/trial";

export default function AppLayout() {
  const { isCollapsed } = useSidebarStore();
  const [trialStatus, setTrialStatus] = useState(null);

  useEffect(() => {
    if (!isMobileApp) return undefined;

    let mounted = true;
    const refreshTrial = async () => {
      const status = await getTrialStatus();
      if (mounted) setTrialStatus(status);
    };

    refreshTrial();
    const timer = setInterval(refreshTrial, 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const trialExpired = isMobileApp && trialStatus?.expired;

  return (
    <div className="flex min-h-screen overflow-hidden bg-surface text-text-primary">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col overflow-hidden relative transition-all duration-300 ${isCollapsed ? "lg:ml-16" : "lg:ml-60"}`}
      >
        <Header />
        <main className="flex-1 overflow-y-auto bg-surface px-4 py-4 sm:px-6 sm:py-6">
          {trialStatus && !trialExpired && (
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
              Trial: {formatTrialRemaining(trialStatus.remainingMs)}
            </div>
          )}
          {trialExpired ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <div className="max-w-md text-center">
                <h1 className="text-2xl font-bold text-text-primary">
                  Trial expired
                </h1>
                <p className="mt-2 text-sm text-text-muted">
                  This offline trial has ended. Set TRIAL_ENABLED to false in
                  src/lib/trial.js to disable the trial gate.
                </p>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
