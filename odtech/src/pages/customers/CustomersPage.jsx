import { useState, useEffect } from "react";
import { Plus, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import DataTable from "../../components/ui/DataTable";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Drawer from "../../components/ui/Drawer";
import CustomerForm from "./CustomerForm";

const STATUS_COLOR = {
  paid: "success",
  partial: "warning",
  unpaid: "danger",
  Active: "success",
  Inactive: "danger",
};
const STATUS_LABEL = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
  Active: "Active",
  Inactive: "Inactive",
};

const PROJECT_LABEL = {
  residential_wiring: "Residential Wiring",
  commercial_wiring: "Commercial Wiring",
  industrial_wiring: "Industrial Wiring",
  panel_upgrade: "Panel Upgrade",
  security_systems: "Security Systems",
  solar_installation: "Solar Installation",
  ev_charging: "EV Charging",
  maintenance: "Maintenance",
  other: "Other",
  Residential: "Residential",
  Commercial: "Commercial",
  Industrial: "Industrial",
};

export default function CustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRequestTime, setLastRequestTime] = useState(0);

  // Fetch customers from Supabase
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      console.debug("Fetching customers...");
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Customers fetch error:", error);
        toast.error(`Failed to load customers: ${error.message}`);
      } else {
        console.debug("Customers loaded:", data?.length ?? 0);
        setCustomers(data || []);
      }
    } catch (err) {
      console.error("Customers fetch exception:", err);
      toast.error("Error loading customers. Check console.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAdd = async (form) => {
    // Prevent rapid successive requests (throttle for 1 second)
    const now = Date.now();
    if (now - lastRequestTime < 1000) {
      toast.error("Please wait a moment before submitting again.");
      return;
    }
    setLastRequestTime(now);

    if (saving) return; // Prevent concurrent requests

    setSaving(true);

    try {
      // Ensure we have a valid session before proceeding
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        toast.error("Authentication error. Please sign in again.");
        return;
      }

      // Map the form state to match our Supabase schema
      const newCustomer = {
        name: form.full_name,
        email: form.email || null,
        phone: form.phone,
        address: form.address + (form.city ? `, ${form.city}` : ""),
        type: form.project_type,
        status: form.payment_status === "unpaid" ? "Inactive" : "Active",
      };

      const { data, error } = await supabase
        .from("customers")
        .insert([newCustomer])
        .select();

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Customer added successfully");
        setCustomers((prev) => [data[0], ...prev]);
        setDrawerOpen(false);
      }
    } catch (err) {
      toast.error("Failed to add customer. Please try again.");
      console.error("Customer creation error:", err);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "name", header: "Name" },
    { key: "phone", header: "Phone" },
    { key: "address", header: "Address" },
    {
      key: "type",
      header: "Customer Type",
      render: (val) => PROJECT_LABEL[val] ?? val,
    },
    {
      key: "status",
      header: "Status",
      render: (val) => (
        <Badge
          label={STATUS_LABEL[val] ?? val}
          color={STATUS_COLOR[val] ?? "default"}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/customers/${row.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Page header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Customers</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {loading
              ? "Loading..."
              : `${customers.length} customer${customers.length !== 1 ? "s" : ""} total`}
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>
          <UserPlus size={16} className="mr-2" />
          Add Customer
        </Button>
      </div>

      {/* ─── Table ─── */}
      <DataTable columns={columns} data={customers} />

      {/* ─── Add-Customer Drawer ─── */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Add New Customer"
        width="w-[520px]"
      >
        <CustomerForm
          onSubmit={handleAdd}
          onCancel={() => setDrawerOpen(false)}
          loading={saving}
        />
      </Drawer>
    </div>
  );
}
