import { useState, useMemo, useEffect } from "react";
import { FileText, User, Calendar, Plus, Trash2, UserPlus } from "lucide-react";
import { supabase } from "../../lib/supabase";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { formatCurrency } from "../../lib/utils";
import { isMobileApp } from "../../lib/platform";
import {
  createCustomer,
  listCustomerOptions,
} from "../../repositories/customerRepository";

const STATUSES = [
  { value: "Draft", label: "Draft" },
  { value: "Sent", label: "Sent" },
  { value: "Paid", label: "Paid" },
  { value: "Partially Paid", label: "Partially Paid" },
  { value: "Overdue", label: "Overdue" },
];

const empty = {
  customer_id: "",
  date: new Date().toISOString().split("T")[0],
  status: "Draft",
  workmanship_cost: 0,
  discount_percentage: 0,
  payment_details: "",
  items: [{ id: 1, description: "", qty: 1, price: 0 }],
};

export default function InvoiceForm({
  type = "Invoice",
  initial = empty,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const [form, setForm] = useState(initial);

  useEffect(() => {
    setForm({
      ...initial,
      payment_details: initial.payment_details ?? "",
      items:
        initial.items?.length > 0
          ? initial.items
          : [{ id: 1, description: "", qty: 1, price: 0 }],
    });
  }, [initial]);

  const [errors, setErrors] = useState({});
  const [customers, setCustomers] = useState([]);
  const [customerMode, setCustomerMode] = useState("existing");
  const [newCustomerName, setNewCustomerName] = useState("");
  const canCreateLocalCustomer = isMobileApp;

  useEffect(() => {
    async function fetchCustomers() {
      if (isMobileApp) {
        setCustomers(await listCustomerOptions());
        return;
      }

      const { data } = await supabase
        .from("customers")
        .select("id, name")
        .order("name");
      if (data) setCustomers(data.map((c) => ({ value: c.id, label: c.name })));
    }
    fetchCustomers();
  }, []);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleItemChange = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now(), description: "", qty: 1, price: 0 },
      ],
    }));
  };

  const removeItem = (id) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  };

  const validate = () => {
    const e = {};
    if (customerMode === "existing" && !form.customer_id)
      e.customer_id = "Customer is required";
    if (!form.date) e.date = "Date is required";
    if (form.items.length === 0) e.items = "At least one item is required";
    return e;
  };

  const lineItemsTotal = useMemo(() => {
    return form.items.reduce(
      (sum, item) =>
        sum + (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0),
      0,
    );
  }, [form.items]);
  const workmanshipCost = Number(form.workmanship_cost) || 0;
  const discountPercentage = Math.min(
    100,
    Math.max(0, Number(form.discount_percentage) || 0),
  );
  const grossTotal = lineItemsTotal + workmanshipCost;
  const discount = grossTotal * (discountPercentage / 100);
  const netTotal = Math.max(0, grossTotal - discount);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const e2 = validate();
      if (
        canCreateLocalCustomer &&
        customerMode === "new" &&
        !newCustomerName.trim()
      ) {
        e2.customer_id = "Customer name is required";
      }
      if (Object.keys(e2).length) {
        setErrors(e2);
        return;
      }

      let customerId = form.customer_id;
      if (canCreateLocalCustomer && customerMode === "new") {
        const customer = await createCustomer({ name: newCustomerName });
        customerId = customer.id;
        setCustomers((previous) => [
          ...previous,
          { value: customer.id, label: customer.name },
        ]);
      }

      await onSubmit({
        ...form,
        customer_id: customerId,
        workmanship_cost: workmanshipCost,
        discount_percentage: discountPercentage,
        discount,
        gross_total: grossTotal,
        net_total: netTotal,
        amount: netTotal,
        type,
      });
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        customer_id: error.message || "Unable to save customer",
      }));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 flex flex-col h-[calc(100vh-140px)]"
    >
      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* ─── Details ─── */}
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-4">
            {type} Details
          </p>
          <div className="space-y-4">
            {customerMode === "existing" ? (
              <Select
                label="Select Customer"
                placeholder="Pick a customer…"
                options={customers}
                value={form.customer_id}
                onChange={(e) => set("customer_id", e.target.value)}
                error={errors.customer_id}
                required
              />
            ) : (
              <Input
                label="New Customer Name"
                placeholder="Type customer or company name"
                icon={User}
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                error={errors.customer_id}
                required
              />
            )}
            {canCreateLocalCustomer && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => {
                  setCustomerMode((mode) =>
                    mode === "existing" ? "new" : "existing",
                  );
                  setErrors((previous) => ({ ...previous, customer_id: "" }));
                }}
              >
                <UserPlus size={15} />
                {customerMode === "existing"
                  ? "Type a new customer"
                  : "Choose an existing customer"}
              </Button>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Issue Date"
                type="date"
                icon={Calendar}
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                error={errors.date}
                required
              />
              <Select
                label="Status"
                options={STATUSES}
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ─── Line Items ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">
              Line Items
            </p>
            {errors.items && (
              <p className="text-xs text-danger">{errors.items}</p>
            )}
          </div>

          <div className="space-y-3">
            {form.items.map((item, i) => (
              <div
                key={item.id}
                className="group relative flex gap-2 items-start bg-surface border border-surface-border p-3 rounded-xl"
              >
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Item Name"
                    value={item.description}
                    onChange={(e) =>
                      handleItemChange(item.id, "description", e.target.value)
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="ml-1 text-xs font-semibold text-text-muted">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter quantity"
                        min="1"
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(item.id, "qty", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="ml-1 text-xs font-semibold text-text-muted">
                        Unit Price
                      </label>
                      <Input
                        type="number"
                        placeholder="Enter unit price"
                        step="0.01"
                        value={item.price}
                        onChange={(e) =>
                          handleItemChange(item.id, "price", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors mt-[2px]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-primary border border-dashed border-primary/30"
            onClick={addItem}
          >
            <Plus size={16} /> Add Line Item
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-surface-border">
            <Input
              label="Workmanship Cost"
              type="number"
              min="0"
              step="0.01"
              value={form.workmanship_cost ?? ""}
              onChange={(e) => set("workmanship_cost", e.target.value)}
              placeholder="0.00"
            />
            <Input
              label="Discount (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.discount_percentage ?? ""}
              onChange={(e) => set("discount_percentage", e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="mt-4 space-y-2 border-t border-surface-border pt-4 px-2">
            <div className="flex justify-between text-sm text-text-muted">
              <span>Gross Total</span>
              <span>{formatCurrency(grossTotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-text-primary">
              <span>Net Total</span>
              <span>{formatCurrency(netTotal)}</span>
            </div>
          </div>
        </div>

        {/* ─── Payment Details (Invoice only) ─── */}
        {type === "Invoice" && (
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">
              Payment Details
            </p>
            <textarea
              className="w-full rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              rows={4}
              placeholder={"e.g. Bank: GCB Bank Ghana\nAccount Name: Phil's Metal Works\nAccount Number: 1234567890\nPayment Terms: Due within 30 days"}
              value={form.payment_details ?? ""}
              onChange={(e) => set("payment_details", e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ─── Actions (sticky footer) ─── */}
      <div className="flex gap-3 pt-4 border-t border-surface-border">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          {initial.id ? `Update ${type}` : `Save ${type}`}
        </Button>
      </div>
    </form>
  );
}
