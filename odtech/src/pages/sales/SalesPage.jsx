import { useEffect, useMemo, useState } from "react";
import { DollarSign, Package, Plus, ReceiptText, ShoppingCart } from "lucide-react";
import { supabase } from "../../lib/supabase";
import toast from "react-hot-toast";
import DataTable from "../../components/ui/DataTable";
import Button from "../../components/ui/Button";
import Drawer from "../../components/ui/Drawer";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { formatCurrency, formatDate } from "../../lib/utils";
import SalesForm from "./SalesForm";
import useAuthStore from "../../store/useAuthStore";
import { getUserRole } from "../../lib/authRoutes";

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getSaleProfit(sale, inventoryCostMap = new Map()) {
  return (sale.sale_items || []).reduce(
    (sum, item) => {
      const snapshotProfit = Number(item.line_profit);

      if (Number.isFinite(snapshotProfit)) {
        return sum + snapshotProfit;
      }

      const unitPrice = Number(item.unit_price || 0);
      const quantity = Number(item.quantity || 0);
      const costSnapshot = Number(item.cost_price_snapshot);
      const currentInventoryCost = Number(
        inventoryCostMap.get(item.inventory_id)?.cost || 0,
      );
      const fallbackCost = Number.isFinite(costSnapshot)
        ? costSnapshot
        : currentInventoryCost;

      return sum + (unitPrice - fallbackCost) * quantity;
    },
    0,
  );
}

export default function SalesPage() {
  const { session, profile } = useAuthStore();
  const isAdmin = getUserRole(profile, session?.user) === "admin";
  const [sales, setSales] = useState([]);
  const [todaySales, setTodaySales] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSalesData = async () => {
    setLoading(true);

    const today = getTodayDate();

    try {
      const [
        salesResponse,
        todaySalesResponse,
        inventoryResponse,
        customersResponse,
      ] = await Promise.all([
        supabase
          .from("sales")
          .select("*, customers(name), sale_items(*), created_by_profile:profiles!sales_created_by_fkey(full_name, email)")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("sales")
          .select("id, total_amount, created_by, sale_items(*)")
          .eq("sale_date", today),
        supabase
          .from("inventory")
          .select("id, name, qty, unit, cost, selling_price, threshold, status")
          .order("name", { ascending: true }),
        supabase
          .from("customers")
          .select("id, name")
          .order("name", { ascending: true }),
      ]);

      const firstError =
        salesResponse.error ||
        todaySalesResponse.error ||
        inventoryResponse.error ||
        customersResponse.error;

      if (firstError) {
        throw firstError;
      }

      setSales(salesResponse.data || []);
      setTodaySales(todaySalesResponse.data || []);
      setInventoryItems(inventoryResponse.data || []);
      setCustomers(customersResponse.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  const inventoryCostMap = useMemo(
    () =>
      new Map(
        inventoryItems.map((item) => [
          item.id,
          { cost: Number(item.cost || 0) },
        ]),
      ),
    [inventoryItems],
  );

  const userOptions = useMemo(() => {
    const usersById = new Map();

    sales.forEach((sale) => {
      if (!sale.created_by || usersById.has(sale.created_by)) return;

      usersById.set(sale.created_by, {
        value: sale.created_by,
        label:
          sale.created_by_profile?.full_name ||
          sale.created_by_profile?.email ||
          "Unknown user",
      });
    });

    return [
      { value: "all", label: "All users" },
      ...Array.from(usersById.values()).sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    ];
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (!isAdmin || selectedUserId === "all") {
      return sales;
    }

    return sales.filter((sale) => sale.created_by === selectedUserId);
  }, [isAdmin, sales, selectedUserId]);

  const filteredTodaySales = useMemo(() => {
    if (!isAdmin || selectedUserId === "all") {
      return todaySales;
    }

    return todaySales.filter((sale) => sale.created_by === selectedUserId);
  }, [isAdmin, selectedUserId, todaySales]);

  const stats = useMemo(() => {
    const totalSales = filteredTodaySales.reduce(
      (sum, sale) => sum + Number(sale.total_amount || 0),
      0,
    );
    const transactions = filteredTodaySales.length;
    const itemsSold = filteredTodaySales.reduce((sum, sale) => {
      const quantity = (sale.sale_items || []).reduce(
        (lineSum, item) => lineSum + Number(item.quantity || 0),
        0,
      );

      return sum + quantity;
    }, 0);

    const totalProfit = filteredTodaySales.reduce(
      (sum, sale) => sum + getSaleProfit(sale, inventoryCostMap),
      0,
    );

    return {
      totalSales,
      transactions,
      itemsSold,
      totalProfit,
      averageSale: transactions ? totalSales / transactions : 0,
    };
  }, [filteredTodaySales, inventoryCostMap]);

  const handleCreateSale = async (form) => {
    setSaving(true);

    try {
      const { data, error } = await supabase.rpc("create_sale", {
        p_sale_date: form.sale_date,
        p_customer_id: form.customer_id,
        p_payment_method: form.payment_method,
        p_notes: form.notes || null,
        p_items: form.items,
      });

      if (error) {
        throw error;
      }

      toast.success("Sale recorded successfully");
      setDrawerOpen(false);
      await fetchSalesData();
      return data;
    } catch (error) {
      console.error("Create sale error:", error);
      toast.error(error.message || "Failed to record sale");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "sale_number", header: "Sale #" },
    ...(isAdmin
      ? [
          {
            key: "created_by_profile",
            header: "User",
            render: (value) => value?.full_name || value?.email || "Unknown",
            searchValue: (row) =>
              `${row.created_by_profile?.full_name || ""} ${row.created_by_profile?.email || ""}`,
          },
        ]
      : []),
    {
      key: "sale_date",
      header: "Date",
      render: (value) => formatDate(value),
    },
    {
      key: "customers",
      header: "Customer",
      render: (value) => value?.name || "Walk-in",
      searchValue: (row) => row.customers?.name || "Walk-in",
    },
    {
      key: "sale_items",
      header: "Items",
      render: (value) => {
        const itemCount = (value || []).reduce(
          (sum, item) => sum + Number(item.quantity || 0),
          0,
        );
        const firstItem = value?.[0]?.item_name_snapshot;

        return itemCount
          ? `${itemCount} item${itemCount > 1 ? "s" : ""}${firstItem ? ` - ${firstItem}` : ""}`
          : "No items";
      },
      searchValue: (row) =>
        (row.sale_items || [])
          .map((item) => item.item_name_snapshot)
          .join(" "),
    },
    { key: "payment_method", header: "Payment" },
    {
      key: "profit",
      header: "Profit",
      render: (_, row) => (
        <span className={`font-semibold ${getSaleProfit(row, inventoryCostMap) >= 0 ? "text-success" : "text-danger"}`}>
          {formatCurrency(getSaleProfit(row, inventoryCostMap))}
        </span>
      ),
      searchValue: (row) => String(getSaleProfit(row, inventoryCostMap)),
    },
    {
      key: "total_amount",
      header: "Total",
      render: (value) => (
        <span className="font-semibold text-text-primary">
          {formatCurrency(value)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Sales Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {loading
              ? "Loading sales overview..."
              : isAdmin
                ? "Track product sales across all allowed users"
                : "Track your completed product sales and today's performance"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {isAdmin && (
            <div className="w-full sm:w-[220px]">
              <Select
                label="User"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                options={userOptions}
                placeholder=""
              />
            </div>
          )}
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus size={16} className="mr-2" />
            Record Sale
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Sales Today"
          value={formatCurrency(stats.totalSales)}
          subtitle="Completed product sales"
          icon={DollarSign}
          color="text-success"
        />
        <StatCard
          title="Transactions Today"
          value={stats.transactions}
          subtitle="Successful sales recorded"
          icon={ReceiptText}
          color="text-info"
        />
        <StatCard
          title="Items Sold Today"
          value={stats.itemsSold}
          subtitle="Units moved from inventory"
          icon={Package}
          color="text-primary"
        />
        <StatCard
          title="Profit Today"
          value={formatCurrency(stats.totalProfit)}
          subtitle="Realized profit from recorded sales"
          icon={ShoppingCart}
          color="text-warning"
        />
      </div>

      <DataTable data={filteredSales} columns={columns} loading={loading} />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Record Sale"
        width="w-full md:w-[780px]"
      >
        <SalesForm
          key={`sales-form-${drawerOpen ? "open" : "closed"}-${inventoryItems.length}-${customers.length}`}
          inventoryItems={inventoryItems.filter(
            (item) => Number(item.qty || 0) > 0,
          )}
          customers={customers}
          onSubmit={handleCreateSale}
          onCancel={() => setDrawerOpen(false)}
          loading={saving}
        />
      </Drawer>
    </div>
  );
}
