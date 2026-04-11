import { supabase } from "./supabase";
import { normalizeNotificationPreferences } from "./settings";
import { jobHasAssignedTechnician } from "./jobAssignments";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_NOTIFICATIONS = 8;
const ASSIGNED_JOB_LOOKBACK_DAYS = 7;

function startOfToday() {
  return new Date(new Date().toDateString());
}

function isoDate(date) {
  return date.toISOString().split("T")[0];
}

function buildNotification({
  id,
  category,
  level = "default",
  title,
  message,
  href,
  createdAt,
}) {
  return {
    id,
    category,
    level,
    title,
    message,
    href,
    created_at: createdAt,
    is_read: false,
  };
}

function normalizeName(value = "") {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function getNotificationStorageKey(userId) {
  return `notifications.read.${userId || "guest"}`;
}

export function readNotificationReadIds(userId) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getNotificationStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to read notification state", error);
    return [];
  }
}

export function writeNotificationReadIds(userId, ids) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getNotificationStorageKey(userId),
      JSON.stringify(Array.from(new Set(ids))),
    );
  } catch (error) {
    console.warn("Failed to persist notification state", error);
  }
}

function applyReadState(notifications, readIds) {
  const readSet = new Set(readIds);

  return notifications.map((notification) => ({
    ...notification,
    is_read: readSet.has(notification.id),
  }));
}

function buildJobNotifications(jobsToday, overdueJobs, preferences) {
  const notifications = [];

  if (!preferences.job_updates) {
    return notifications;
  }

  if (jobsToday.length > 0) {
    const latestScheduled = jobsToday
      .map((job) => job.created_at || job.scheduled_date)
      .sort()
      .slice(-1)[0];

    notifications.push(
      buildNotification({
        id: `jobs-today-${isoDate(startOfToday())}`,
        category: "jobs",
        level: "info",
        title: `${jobsToday.length} job${jobsToday.length === 1 ? "" : "s"} scheduled today`,
        message: jobsToday
          .slice(0, 2)
          .map((job) => job.title)
          .join(", "),
        href: "/jobs",
        createdAt: latestScheduled,
      }),
    );
  }

  if (overdueJobs.length > 0) {
    const latestOverdue = overdueJobs
      .map((job) => job.scheduled_date)
      .sort()
      .slice(-1)[0];

    notifications.push(
      buildNotification({
        id: `jobs-overdue-${isoDate(startOfToday())}`,
        category: "jobs",
        level: "warning",
        title: `${overdueJobs.length} pending job${overdueJobs.length === 1 ? "" : "s"} overdue`,
        message: "Some scheduled jobs are still not completed.",
        href: "/jobs",
        createdAt: latestOverdue,
      }),
    );
  }

  return notifications;
}

async function findWorkerForProfile(profile) {
  if (!profile) {
    return null;
  }

  const email = profile.email?.trim();
  const fullName = normalizeName(profile.full_name);

  if (email) {
    const { data: emailWorker } = await supabase
      .from("workers")
      .select("id, name, email")
      .eq("email", email)
      .maybeSingle();

    if (emailWorker) {
      return emailWorker;
    }
  }

  if (fullName) {
    const { data: workersByName } = await supabase
      .from("workers")
      .select("id, name, email")
      .order("name", { ascending: true });

    return (
      workersByName?.find(
        (worker) => normalizeName(worker.name) === fullName,
      ) || null
    );
  }

  return null;
}

function buildAssignedJobNotifications(assignedJobs, preferences) {
  if (!preferences.job_updates || assignedJobs.length === 0) {
    return [];
  }

  return assignedJobs.map((job) => {
    const customerName = job.customers?.name || "Walk-in customer";
    const scheduledDate = job.scheduled_date || "Unscheduled";

    return buildNotification({
      id: `job-assigned-${job.id}`,
      category: "assignment",
      level: "info",
      title: `New job assigned: ${job.title}`,
      message: `${customerName} - ${scheduledDate}`,
      href: `/jobs/${job.id}`,
      createdAt: job.created_at,
    });
  });
}

function buildCustomerNotifications(customers, preferences) {
  if (!preferences.customer_updates || customers.length === 0) {
    return [];
  }

  const latestCreated = customers
    .map((customer) => customer.created_at)
    .sort()
    .slice(-1)[0];

  return [
    buildNotification({
      id: `customers-recent-${isoDate(startOfToday())}`,
      category: "customers",
      level: "info",
      title: `${customers.length} new customer${customers.length === 1 ? "" : "s"} added recently`,
      message: customers
        .slice(0, 2)
        .map((customer) => customer.name)
        .join(", "),
      href: "/customers",
      createdAt: latestCreated,
    }),
  ];
}

function buildInventoryNotifications(lowStockItems, preferences) {
  if (!preferences.system_alerts || lowStockItems.length === 0) {
    return [];
  }

  const latestItem = lowStockItems
    .map((item) => item.created_at)
    .sort()
    .slice(-1)[0];

  return [
    buildNotification({
      id: `inventory-low-stock-${isoDate(startOfToday())}`,
      category: "inventory",
      level: "danger",
      title: `${lowStockItems.length} inventory item${lowStockItems.length === 1 ? "" : "s"} low on stock`,
      message: `${lowStockItems[0].name} needs restocking soon.`,
      href: "/inventory",
      createdAt: latestItem,
    }),
  ];
}

function buildBillingNotifications(overdueInvoices, receiptsToday, preferences) {
  const notifications = [];

  if (preferences.system_alerts && overdueInvoices.length > 0) {
    const latestOverdue = overdueInvoices
      .map((invoice) => invoice.date)
      .sort()
      .slice(-1)[0];

    notifications.push(
      buildNotification({
        id: `billing-overdue-${isoDate(startOfToday())}`,
        category: "billing",
        level: "warning",
        title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"} need attention`,
        message: "Check the billing module for overdue customer balances.",
        href: "/billing",
        createdAt: latestOverdue,
      }),
    );
  }

  if (preferences.email_alerts && receiptsToday.length > 0) {
    const totalReceived = receiptsToday.reduce(
      (sum, receipt) => sum + Number(receipt.amount || 0),
      0,
    );
    const latestReceipt = receiptsToday
      .map((receipt) => receipt.created_at || receipt.date)
      .sort()
      .slice(-1)[0];

    notifications.push(
      buildNotification({
        id: `receipts-today-${isoDate(startOfToday())}`,
        category: "payments",
        level: "success",
        title: `${receiptsToday.length} receipt${receiptsToday.length === 1 ? "" : "s"} recorded today`,
        message: `Collected GHS ${Number(totalReceived).toFixed(2)} so far today.`,
        href: "/receipts",
        createdAt: latestReceipt,
      }),
    );
  }

  return notifications;
}

function buildSalesNotifications(salesToday, preferences) {
  if (!preferences.system_alerts || salesToday.length === 0) {
    return [];
  }

  const totalSales = salesToday.reduce(
    (sum, sale) => sum + Number(sale.total_amount || 0),
    0,
  );
  const latestSale = salesToday
    .map((sale) => sale.created_at || sale.sale_date)
    .sort()
    .slice(-1)[0];

  return [
    buildNotification({
      id: `sales-today-${isoDate(startOfToday())}`,
      category: "sales",
      level: "success",
      title: `${salesToday.length} sale${salesToday.length === 1 ? "" : "s"} recorded today`,
      message: `Sales today total GHS ${Number(totalSales).toFixed(2)}.`,
      href: "/sales",
      createdAt: latestSale,
    }),
  ];
}

export async function fetchNotificationFeed(profile) {
  const preferences = normalizeNotificationPreferences(
    profile?.notification_preferences,
  );
  const today = startOfToday();
  const todayString = isoDate(today);
  const recentCustomerStart = isoDate(
    new Date(today.getTime() - 3 * DAY_IN_MS),
  );
  const assignedJobStart = new Date(
    today.getTime() - ASSIGNED_JOB_LOOKBACK_DAYS * DAY_IN_MS,
  ).toISOString();
  const worker = await findWorkerForProfile(profile);

  const [
    jobsTodayResponse,
    overdueJobsResponse,
    assignedJobsResponse,
    customersResponse,
    lowStockResponse,
    overdueInvoicesResponse,
    receiptsTodayResponse,
    salesTodayResponse,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, scheduled_date, created_at, status")
      .eq("scheduled_date", todayString)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("jobs")
      .select("id, title, scheduled_date, status")
      .lt("scheduled_date", todayString)
      .neq("status", "Completed")
      .order("scheduled_date", { ascending: false })
      .limit(10),
    worker
      ? supabase
          .from("jobs")
          .select("id, title, created_at, scheduled_date, customers(name), technician_id, technician_ids")
          .gte("created_at", assignedJobStart)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("customers")
      .select("id, name, created_at")
      .gte("created_at", `${recentCustomerStart}T00:00:00.000Z`)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("inventory")
      .select("id, name, qty, unit, created_at")
      .eq("status", "Low Stock")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("billing_documents")
      .select("id, document_number, date, status")
      .eq("status", "Overdue")
      .order("date", { ascending: false })
      .limit(10),
    supabase
      .from("receipts")
      .select("id, amount, date, created_at")
      .eq("date", todayString)
      .order("created_at", { ascending: false }),
    supabase
      .from("sales")
      .select("id, total_amount, sale_date, created_at")
      .eq("sale_date", todayString)
      .order("created_at", { ascending: false }),
  ]);

  const responses = [
    jobsTodayResponse,
    overdueJobsResponse,
    assignedJobsResponse,
    customersResponse,
    lowStockResponse,
    overdueInvoicesResponse,
    receiptsTodayResponse,
    salesTodayResponse,
  ];

  const firstError = responses.find((response) => response.error)?.error;
  if (firstError) {
    throw firstError;
  }

  const notifications = [
    ...buildJobNotifications(
      jobsTodayResponse.data || [],
      overdueJobsResponse.data || [],
      preferences,
    ),
    ...buildAssignedJobNotifications(
      (assignedJobsResponse.data || []).filter((job) =>
        jobHasAssignedTechnician(job, worker?.id),
      ),
      preferences,
    ),
    ...buildCustomerNotifications(customersResponse.data || [], preferences),
    ...buildInventoryNotifications(lowStockResponse.data || [], preferences),
    ...buildBillingNotifications(
      overdueInvoicesResponse.data || [],
      receiptsTodayResponse.data || [],
      preferences,
    ),
    ...buildSalesNotifications(salesTodayResponse.data || [], preferences),
  ]
    .sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() -
        new Date(left.created_at || 0).getTime(),
    )
    .slice(0, MAX_NOTIFICATIONS);

  return notifications;
}

export function applyNotificationReadState(notifications, userId) {
  return applyReadState(notifications, readNotificationReadIds(userId));
}
