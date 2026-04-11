import { useMemo, useState } from "react";
import { Calendar, CreditCard, Package, Plus, Trash2 } from "lucide-react";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import { formatCurrency } from "../../lib/utils";

const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "Mobile Money", label: "Mobile Money" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Card", label: "Card" },
  { value: "Other", label: "Other" },
];

const emptyLine = {
  inventory_id: "",
  quantity: "1",
  unit_price: "",
};

function getDefaultForm() {
  return {
    sale_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    payment_method: "Cash",
    notes: "",
    items: [{ ...emptyLine }],
  };
}

function getInventoryMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

export default function SalesForm({
  inventoryItems,
  customers,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const [form, setForm] = useState(getDefaultForm);
  const [errors, setErrors] = useState({});

  const inventoryMap = useMemo(
    () => getInventoryMap(inventoryItems),
    [inventoryItems],
  );

  const lineItems = form.items.map((item) => {
    const inventory = inventoryMap.get(item.inventory_id);
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);

    return {
      ...item,
      inventory,
      quantity,
      unitPrice,
      lineTotal: quantity * unitPrice,
    };
  });

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + (Number.isFinite(item.lineTotal) ? item.lineTotal : 0),
    0,
  );

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const setLineField = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      const nextItem = { ...items[index], [field]: value };

      if (field === "inventory_id") {
        const inventory = inventoryMap.get(value);
        nextItem.unit_price = inventory
          ? String(inventory.selling_price ?? 0)
          : "";
        nextItem.quantity = inventory && Number(inventory.qty) > 0 ? "1" : "0";
      }

      items[index] = nextItem;
      return { ...prev, items };
    });

    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: "" }));
    }
  };

  const addLine = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyLine }] }));
  };

  const removeLine = (index) => {
    setForm((prev) => {
      if (prev.items.length === 1) {
        return { ...prev, items: [{ ...emptyLine }] };
      }

      return {
        ...prev,
        items: prev.items.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.sale_date) {
      nextErrors.sale_date = "Sale date is required.";
    }

    if (!form.payment_method) {
      nextErrors.payment_method = "Payment method is required.";
    }

    const hasEmptyInventory = lineItems.some((item) => !item.inventory_id);
    const hasBadQuantity = lineItems.some(
      (item) =>
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        (item.inventory && item.quantity > Number(item.inventory.qty)),
    );
    const hasBadPrice = lineItems.some(
      (item) => !Number.isFinite(item.unitPrice) || item.unitPrice < 0,
    );

    if (hasEmptyInventory) {
      nextErrors.items = "Select an inventory item for each sale line.";
    } else if (hasBadQuantity) {
      nextErrors.items = "Sale quantities must be positive and within available stock.";
    } else if (hasBadPrice) {
      nextErrors.items = "Unit prices must be valid amounts.";
    }

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      sale_date: form.sale_date,
      customer_id: form.customer_id || null,
      payment_method: form.payment_method,
      notes: form.notes.trim(),
      items: lineItems.map((item) => ({
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Sale Details
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Sale Date"
            type="date"
            icon={Calendar}
            value={form.sale_date}
            onChange={(event) => setField("sale_date", event.target.value)}
            error={errors.sale_date}
            required
          />
          <Select
            label="Payment Method"
            value={form.payment_method}
            onChange={(event) =>
              setField("payment_method", event.target.value)
            }
            options={PAYMENT_METHODS}
            error={errors.payment_method}
            required
          />
        </div>

        <div className="mt-4">
          <Select
            label="Customer"
            value={form.customer_id}
            onChange={(event) => setField("customer_id", event.target.value)}
            options={customers.map((customer) => ({
              value: customer.id,
              label: customer.name,
            }))}
            placeholder="Walk-in sale"
          />
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Items Sold
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus size={14} className="mr-1.5" />
            Add Line
          </Button>
        </div>

        <div className="space-y-4">
          {lineItems.map((item, index) => {
            const availableStock = Number(item.inventory?.qty ?? 0);
            const unitLabel = item.inventory?.unit || "pcs";

            return (
              <div
                key={`${item.inventory_id || "line"}-${index}`}
                className="rounded-2xl border border-surface-border bg-surface p-4"
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,2fr)_100px_130px_auto]">
                  <Select
                    label={`Item ${index + 1}`}
                    value={item.inventory_id}
                    onChange={(event) =>
                      setLineField(index, "inventory_id", event.target.value)
                    }
                    options={inventoryItems.map((inventory) => ({
                      value: inventory.id,
                      label: `${inventory.name} (${inventory.qty} ${inventory.unit})`,
                    }))}
                    placeholder="Select item"
                    required
                  />

                  <Input
                    label="Qty"
                    type="number"
                    min="1"
                    max={availableStock || undefined}
                    value={item.quantity}
                    onChange={(event) =>
                      setLineField(index, "quantity", event.target.value)
                    }
                    required
                  />

                  <Input
                    label="Unit Price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(event) =>
                      setLineField(index, "unit_price", event.target.value)
                    }
                    required
                  />

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(index)}
                      disabled={loading}
                    >
                      <Trash2 size={14} className="mr-1.5" />
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="text-text-muted">
                    {item.inventory ? (
                      <>
                        In stock:{" "}
                        <span className="font-medium text-text-primary">
                          {availableStock} {unitLabel}
                        </span>
                      </>
                    ) : (
                      "Choose a product from inventory."
                    )}
                  </p>
                  <p className="font-semibold text-text-primary">
                    Line Total: {formatCurrency(item.lineTotal)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {errors.items && <p className="mt-3 text-sm text-danger">{errors.items}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-text-secondary">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={(event) => setField("notes", event.target.value)}
          rows={4}
          placeholder="Optional sale notes"
          className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="rounded-2xl border border-surface-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-muted">
            <CreditCard size={16} />
            <span className="text-sm">Total Amount</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
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
          <Package size={16} className="mr-2" />
          Record Sale
        </Button>
      </div>
    </form>
  );
}
