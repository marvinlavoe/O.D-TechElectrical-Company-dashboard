import { useEffect, useMemo, useState } from "react";
import { Edit2, MailPlus, RefreshCcw, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import DataTable from "../../components/ui/DataTable";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import useAuthStore from "../../store/useAuthStore";
import { MODULES } from "../../lib/authRoutes";

const MODULE_OPTIONS = Object.values(MODULES);

const emptyForm = {
  id: null,
  email: "",
  full_name: "",
  role: "worker",
  modules: [],
  is_active: true,
  notes: "",
};

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export default function ModuleAccessPage() {
  const { session } = useAuthStore();
  const [grants, setGrants] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchGrants = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("module_access_grants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setGrants(data || []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to load module access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrants();
  }, []);

  const stats = useMemo(() => {
    const activeGrants = grants.filter((grant) => grant.is_active);

    return {
      activeUsers: activeGrants.length,
      salesUsers: activeGrants.filter((grant) =>
        grant.modules?.includes("sales"),
      ).length,
      merchantUsers: activeGrants.filter((grant) =>
        grant.modules?.includes("merchant_hub"),
      ).length,
    };
  }, [grants]);

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleModule = (moduleKey) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.includes(moduleKey)
        ? current.modules.filter((item) => item !== moduleKey)
        : [...current.modules, moduleKey],
    }));
  };

  const resetForm = () => setForm(emptyForm);

  const handleEdit = (grant) => {
    setForm({
      id: grant.id,
      email: grant.email || "",
      full_name: grant.full_name || "",
      role: grant.role || "worker",
      modules: grant.modules || [],
      is_active: Boolean(grant.is_active),
      notes: grant.notes || "",
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const email = normalizeEmail(form.email);

    if (!email) {
      toast.error("Email is required");
      return;
    }

    if (form.modules.length === 0 && form.role !== "admin") {
      toast.error("Choose at least one module");
      return;
    }

    setSaving(true);

    const payload = {
      email,
      full_name: form.full_name.trim() || null,
      role: form.role,
      modules: form.modules,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
      updated_by: session?.user?.id || null,
    };

    try {
      let error;

      if (form.id) {
        ({ error } = await supabase
          .from("module_access_grants")
          .update(payload)
          .eq("id", form.id));
      } else {
        const { data: existing, error: findError } = await supabase
          .from("module_access_grants")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (findError && findError.code !== "PGRST116") {
          throw findError;
        }

        if (existing?.id) {
          ({ error } = await supabase
            .from("module_access_grants")
            .update(payload)
            .eq("id", existing.id));
        } else {
          ({ error } = await supabase.from("module_access_grants").insert({
            ...payload,
            created_by: session?.user?.id || null,
          }));
        }
      }

      if (error) throw error;

      toast.success("Module access saved");
      resetForm();
      await fetchGrants();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to save module access");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "email",
      header: "Email",
      render: (value, row) => (
        <div>
          <p className="font-medium text-text-primary">{value}</p>
          <p className="text-xs text-text-muted">{row.full_name || "No name"}</p>
        </div>
      ),
      searchValue: (row) => `${row.email} ${row.full_name || ""}`,
    },
    {
      key: "modules",
      header: "Modules",
      render: (value) => (
        <div className="flex flex-wrap gap-1.5">
          {(value || []).map((moduleKey) => (
            <Badge
              key={moduleKey}
              label={MODULES[moduleKey]?.label || moduleKey}
              color="info"
            />
          ))}
        </div>
      ),
      searchValue: (row) =>
        (row.modules || [])
          .map((moduleKey) => MODULES[moduleKey]?.label || moduleKey)
          .join(" "),
    },
    {
      key: "role",
      header: "Role",
      render: (value) => <Badge label={value || "worker"} color="default" />,
    },
    {
      key: "is_active",
      header: "Status",
      render: (value) => (
        <Badge label={value ? "Active" : "Inactive"} color={value ? "success" : "danger"} dot />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (_, row) => (
        <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(row)}>
          <Edit2 size={14} />
          Edit
        </Button>
      ),
      searchValue: () => "",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Module Access
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            Assign email addresses to sales and merchant hub workspaces.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={fetchGrants}>
          <RefreshCcw size={16} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Active Emails"
          value={stats.activeUsers}
          subtitle="Allowed user accounts"
          icon={MailPlus}
          color="text-primary"
        />
        <StatCard
          title="Sales Users"
          value={stats.salesUsers}
          subtitle="Can record product sales"
          icon={Save}
          color="text-success"
        />
        <StatCard
          title="Merchant Hub Users"
          value={stats.merchantUsers}
          subtitle="Can record daily merchant entries"
          icon={RefreshCcw}
          color="text-info"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {form.id ? "Edit Email" : "Add Email"}
              </h2>
              <p className="text-sm text-text-muted">
                {form.id ? form.email : "Create a module assignment"}
              </p>
            </div>
            {form.id && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                <X size={14} />
                Clear
              </Button>
            )}
          </div>

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
            required
          />

          <Input
            label="Name"
            value={form.full_name}
            onChange={(event) => setField("full_name", event.target.value)}
          />

          <Select
            label="Role"
            value={form.role}
            onChange={(event) => setField("role", event.target.value)}
            options={[
              { value: "worker", label: "Worker" },
              { value: "admin", label: "Admin" },
            ]}
            placeholder=""
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-text-secondary">Modules</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {MODULE_OPTIONS.map((moduleItem) => (
                <label
                  key={moduleItem.key}
                  className="flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary"
                >
                  <span>{moduleItem.label}</span>
                  <input
                    type="checkbox"
                    checked={form.modules.includes(moduleItem.key)}
                    onChange={() => toggleModule(moduleItem.key)}
                    className="h-4 w-4 rounded border-surface-border bg-surface-card text-primary focus:ring-primary/40"
                  />
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => setField("is_active", event.target.checked)}
              className="h-4 w-4 rounded border-surface-border bg-surface text-primary focus:ring-primary/40"
            />
            Active
          </label>

          <Input
            label="Notes"
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
          />

          <Button type="submit" className="w-full" loading={saving}>
            <Save size={16} />
            Save Access
          </Button>
        </form>

        <DataTable data={grants} columns={columns} loading={loading} />
      </div>
    </div>
  );
}
