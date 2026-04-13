import { supabase } from "./supabase";
import { getAssignedTechnicianIds, jobHasAssignedTechnician } from "./jobAssignments";

async function setWorkersStatus(workerIds = [], status) {
  if (!workerIds.length) {
    return;
  }

  const { error } = await supabase
    .from("workers")
    .update({ status })
    .in("id", workerIds);

  if (error) {
    throw error;
  }
}

export async function updateJobStatusAndAssignedWorkers(job, nextStatus) {
  if (!job?.id) {
    throw new Error("Job record is missing.");
  }

  const assignedWorkerIds = getAssignedTechnicianIds(job);

  const { error: jobError } = await supabase
    .from("jobs")
    .update({ status: nextStatus })
    .eq("id", job.id);

  if (jobError) {
    throw jobError;
  }

  if (!assignedWorkerIds.length) {
    return;
  }

  if (nextStatus === "In Progress") {
    await setWorkersStatus(assignedWorkerIds, "On Job");
    return;
  }

  const { data: activeJobs, error: activeJobsError } = await supabase
    .from("jobs")
    .select("id, status, technician_id, technician_ids")
    .eq("status", "In Progress");

  if (activeJobsError) {
    throw activeJobsError;
  }

  const stillBusyIds = assignedWorkerIds.filter((workerId) =>
    (activeJobs || []).some(
      (activeJob) =>
        String(activeJob.id) !== String(job.id) &&
        jobHasAssignedTechnician(activeJob, workerId),
    ),
  );
  const availableIds = assignedWorkerIds.filter(
    (workerId) => !stillBusyIds.some((busyId) => String(busyId) === String(workerId)),
  );

  await Promise.all([
    stillBusyIds.length ? setWorkersStatus(stillBusyIds, "On Job") : Promise.resolve(),
    availableIds.length ? setWorkersStatus(availableIds, "Available") : Promise.resolve(),
  ]);
}
