import { supabase } from "./supabase";

function normalizeName(value = "") {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function findWorkerForUser(profile = null, user = null) {
  if (!profile && !user) {
    return null;
  }

  const email = profile?.email?.trim() || user?.email?.trim() || "";
  const fullName = normalizeName(profile?.full_name || "");

  if (email) {
    const { data: emailWorker, error: emailError } = await supabase
      .from("workers")
      .select("id, name, email, status")
      .eq("email", email)
      .maybeSingle();

    if (emailError) {
      throw emailError;
    }

    if (emailWorker) {
      return emailWorker;
    }
  }

  if (fullName) {
    const { data: workersByName, error: workersError } = await supabase
      .from("workers")
      .select("id, name, email, status")
      .order("name", { ascending: true });

    if (workersError) {
      throw workersError;
    }

    return (
      workersByName?.find((worker) => normalizeName(worker.name) === fullName) ||
      null
    );
  }

  return null;
}
