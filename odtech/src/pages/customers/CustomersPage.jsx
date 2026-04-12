import { useState, useEffect } from "react";
import { UserPlus, Users, UserCheck, UserX, CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import DataTable from "../../components/ui/DataTable";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Drawer from "../../components/ui/Drawer";
import StatCard from "../../components/ui/StatCard";
import CustomerForm from "./CustomerForm";
import { buildCustomerInsertPayload } from "../../lib/customerPayloads";

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
    const now = Date.now();
    if (now - lastRequestTime < 1000) {
      toast.error("Please wait a moment before submitting again.");
      return;
    }
    setLastRequestTime(now);

    if (saving) return;

    setSaving(true);

    try {
      const newCustomer = buildCustomerInsertPayload(form);

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

  const activeCustomers = customers.filter((customer) => customer.status === "Active").length;
  const inactiveCustomers = customers.filter((customer) => customer.status === "Inactive").length;
  const now = new Date();
  const newThisMonth = customers.filter((customer) => {
    if (!customer.created_at) return false;
    const createdAt = new Date(customer.created_at);
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Customers</h1>
          <p className="mt-0.5 text-sm text-text-muted">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={customers.length}
          subtitle="All customer records"
          icon={Users}
          color="text-primary"
        />
        <StatCard
          title="Active"
          value={activeCustomers}
          subtitle="Currently active customers"
          icon={UserCheck}
          color="text-success"
        />
        <StatCard
          title="Inactive"
          value={inactiveCustomers}
          subtitle="Customers marked inactive"
          icon={UserX}
          color="text-danger"
        />
        <StatCard
          title="New This Month"
          value={newThisMonth}
          subtitle="Added in the current month"
          icon={CalendarPlus}
          color="text-info"
        />
      </div>

      <DataTable columns={columns} data={customers} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Add New Customer"
        width="w-full md:w-[520px]"
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
