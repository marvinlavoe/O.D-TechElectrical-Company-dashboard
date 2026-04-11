import { useEffect, useMemo, useState } from "react";
import {
  DollarSign,
  Landmark,
  Plus,
  Smartphone,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import DataTable from "../../components/ui/DataTable";
import Button from "../../components/ui/Button";
import Drawer from "../../components/ui/Drawer";
import Input from "../../components/ui/Input";
import StatCard from "../../components/ui/StatCard";
import { formatCurrency, formatDate } from "../../lib/utils";
import MerchantHubForm from "./MerchantHubForm";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function normalizeEntry(entry) {
  return {
    ...entry,
    extras: entry.merchant_hub_entry_extras || [],
  };
}

function getEntryStats(entry) {
  const physicalCommission = Number(entry?.physical_commission || 0);
  const physicalCashCapital = Number(entry?.physical_cash_capital || 0);
  const electronicCommission = Number(entry?.electronic_commission || 0);
  const electronicCashCapital = Number(entry?.electronic_cash_capital || 0);
  const extrasTotal = (entry?.extras || []).reduce(
    (sum, extra) => sum + Number(extra.amount || 0),
    0,
  );
  const totalCommission = physicalCommission + electronicCommission;

  return {
    physicalCommission,
    physicalCashCapital,
    electronicCommission,
    electronicCashCapital,
    extrasTotal,
    totalCommission,
    grandTotal:
      totalCommission + physicalCashCapital + electronicCashCapital + extrasTotal,
  };
}

export default function MerchantHubPage() {
  const [entries, setEntries] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("merchant_hub_entries")
        .select("*, merchant_hub_entry_extras(*)")
        .order("entry_date", { ascending: false })
        .limit(60);

      if (error) {
        throw error;
      }

      setEntries((data || []).map(normalizeEntry));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load merchant hub data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.entry_date === selectedDate) || null,
    [entries, selectedDate],
  );

  const stats = useMemo(() => getEntryStats(selectedEntry), [selectedEntry]);

  const handleSave = async (form) => {
    const isUpdatingExistingDate = entries.some(
      (entry) => entry.entry_date === form.entry_date,
    );

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc("upsert_merchant_hub_entry", {
        p_entry_date: form.entry_date,
        p_physical_commission: form.physical_commission,
        p_physical_cash_capital: form.physical_cash_capital,
        p_electronic_commission: form.electronic_commission,
        p_electronic_cash_capital: form.electronic_cash_capital,
        p_notes: form.notes || null,
        p_extras: form.extras,
      });

      if (error) {
        throw error;
      }

      setSelectedDate(form.entry_date);
      setDrawerOpen(false);
      toast.success(
        isUpdatingExistingDate
          ? "Merchant hub entry updated"
          : "Merchant hub entry saved",
      );
      await fetchEntries();
      return data;
    } catch (error) {
      console.error("Merchant hub save error:", error);
      toast.error(error.message || "Failed to save merchant hub entry");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "entry_date",
      header: "Date",
      render: (value) => formatDate(value),
    },
    {
      key: "physical_commission",
      header: "Physical Comm.",
      render: (value) => formatCurrency(value),
    },
    {
      key: "electronic_commission",
      header: "Electronic Comm.",
      render: (value) => formatCurrency(value),
    },
    {
      key: "merchant_hub_entry_extras",
      header: "Extras",
      render: (_, row) => formatCurrency(getEntryStats(row).extrasTotal),
      searchValue: (row) =>
        `${row.notes || ""} ${(row.extras || []).map((extra) => extra.label).join(" ")}`,
    },
    {
      key: "grand_total",
      header: "Grand Total",
      render: (_, row) => (
        <span className="font-semibold text-text-primary">
          {formatCurrency(getEntryStats(row).grandTotal)}
        </span>
      ),
      searchValue: (row) => row.entry_date,
    },
  ];

  const selectedDateLabel = formatDate(selectedDate, "long");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Merchant Hub
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {loading
              ? "Loading mobile money summaries..."
              : "Track daily physical and electronic merchant balances in one place"}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-[220px]">
            <Input
              label="Selected Day"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </div>
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus size={16} className="mr-2" />
            {selectedEntry ? "Edit Day" : "Record Day"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-surface-border bg-surface-card px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
          Selected Date
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-text-primary">
              {selectedDateLabel}
            </p>
            <p className="text-sm text-text-muted">
              {selectedEntry
                ? "Daily merchant figures loaded for editing and review."
                : "No saved summary yet for this date."}
            </p>
          </div>
          {selectedEntry && (
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Existing Entry
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Commission"
          value={formatCurrency(stats.totalCommission)}
          subtitle="Physical plus electronic"
          icon={DollarSign}
          color="text-success"
        />
        <StatCard
          title="Physical Cash Capital"
          value={formatCurrency(stats.physicalCashCapital)}
          subtitle="Cash on hand"
          icon={Wallet}
          color="text-primary"
        />
        <StatCard
          title="Electronic Cash Capital"
          value={formatCurrency(stats.electronicCashCapital)}
          subtitle="Wallet or float capital"
          icon={Landmark}
          color="text-info"
        />
        <StatCard
          title="Extras Total"
          value={formatCurrency(stats.extrasTotal)}
          subtitle={`${selectedEntry?.extras?.length || 0} extra row${selectedEntry?.extras?.length === 1 ? "" : "s"}`}
          icon={Plus}
          color="text-warning"
        />
        <StatCard
          title="Grand Total Recorded"
          value={formatCurrency(stats.grandTotal)}
          subtitle="All tracked amounts for the day"
          icon={Smartphone}
          color="text-primary"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Recent Daily Entries
            </h2>
            <p className="text-sm text-text-muted">
              Click any row to review or update that day&apos;s merchant summary.
            </p>
          </div>
        </div>

        <DataTable
          data={entries}
          columns={columns}
          loading={loading}
          onRowClick={(row) => {
            setSelectedDate(row.entry_date);
            setDrawerOpen(true);
          }}
        />
      </div>

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedEntry ? "Update Merchant Day" : "Record Merchant Day"}
        width="w-full md:w-[760px]"
      >
        <MerchantHubForm
          key={`merchant-hub-form-${selectedDate}-${selectedEntry?.id || "new"}`}
          initialDate={selectedDate}
          initialData={selectedEntry}
          onSubmit={handleSave}
          onCancel={() => setDrawerOpen(false)}
          loading={saving}
        />
      </Drawer>
    </div>
  );
}
