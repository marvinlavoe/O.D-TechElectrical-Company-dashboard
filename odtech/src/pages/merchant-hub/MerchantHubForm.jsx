import { useMemo, useState } from "react";
import {
  Calendar,
  DollarSign,
  Landmark,
  Plus,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { formatCurrency } from "../../lib/utils";

const emptyExtra = {
  label: "",
  amount: "",
};

function getInitialForm(initialDate, initialData) {
  if (initialData) {
    return {
      entry_date: initialData.entry_date || initialDate,
      physical_commission: String(initialData.physical_commission ?? 0),
      physical_cash_capital: String(initialData.physical_cash_capital ?? 0),
      electronic_commission: String(initialData.electronic_commission ?? 0),
      electronic_cash_capital: String(initialData.electronic_cash_capital ?? 0),
      notes: initialData.notes || "",
      extras: (initialData.extras || []).map((extra) => ({
        label: extra.label || "",
        amount: String(extra.amount ?? 0),
      })),
    };
  }

  return {
    entry_date: initialDate,
    physical_commission: "0",
    physical_cash_capital: "0",
    electronic_commission: "0",
    electronic_cash_capital: "0",
    notes: "",
    extras: [],
  };
}

function parseAmount(value) {
  const parsedValue = Number(value || 0);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
}

export default function MerchantHubForm({
  initialDate,
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) {
  const [form, setForm] = useState(() => getInitialForm(initialDate, initialData));
  const [errors, setErrors] = useState({});

  const normalizedExtras = useMemo(
    () =>
      form.extras
        .map((extra) => ({
          label: extra.label.trim(),
          amount: extra.amount,
        }))
        .filter((extra) => extra.label || String(extra.amount).trim() !== ""),
    [form.extras],
  );

  const totals = useMemo(() => {
    const physicalCommission = parseAmount(form.physical_commission);
    const physicalCashCapital = parseAmount(form.physical_cash_capital);
    const electronicCommission = parseAmount(form.electronic_commission);
    const electronicCashCapital = parseAmount(form.electronic_cash_capital);
    const extrasTotal = normalizedExtras.reduce((sum, extra) => {
      const amount = parseAmount(extra.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

    return {
      totalCommission:
        (Number.isFinite(physicalCommission) ? physicalCommission : 0) +
        (Number.isFinite(electronicCommission) ? electronicCommission : 0),
      physicalCashCapital: Number.isFinite(physicalCashCapital)
        ? physicalCashCapital
        : 0,
      electronicCashCapital: Number.isFinite(electronicCashCapital)
        ? electronicCashCapital
        : 0,
      extrasTotal,
    };
  }, [
    form.electronic_cash_capital,
    form.electronic_commission,
    form.physical_cash_capital,
    form.physical_commission,
    normalizedExtras,
  ]);

  const grandTotal =
    totals.totalCommission +
    totals.physicalCashCapital +
    totals.electronicCashCapital +
    totals.extrasTotal;

  const setField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: "" }));
    }
  };

  const setExtraField = (index, field, value) => {
    setForm((previous) => {
      const extras = [...previous.extras];
      extras[index] = { ...extras[index], [field]: value };
      return { ...previous, extras };
    });

    if (errors.extras) {
      setErrors((previous) => ({ ...previous, extras: "" }));
    }
  };

  const addExtra = () => {
    setForm((previous) => ({
      ...previous,
      extras: [...previous.extras, { ...emptyExtra }],
    }));
  };

  const removeExtra = (index) => {
    setForm((previous) => ({
      ...previous,
      extras: previous.extras.filter((_, extraIndex) => extraIndex !== index),
    }));
  };

  const validate = () => {
    const nextErrors = {};
    const amountFields = [
      "physical_commission",
      "physical_cash_capital",
      "electronic_commission",
      "electronic_cash_capital",
    ];

    if (!form.entry_date) {
      nextErrors.entry_date = "Entry date is required.";
    }

    const hasInvalidCoreAmount = amountFields.some((field) => {
      const amount = parseAmount(form[field]);
      return !Number.isFinite(amount) || amount < 0;
    });

    if (hasInvalidCoreAmount) {
      nextErrors.amounts = "All merchant hub amounts must be valid non-negative values.";
    }

    const hasInvalidExtra = normalizedExtras.some((extra) => {
      const amount = parseAmount(extra.amount);
      return !extra.label || !Number.isFinite(amount) || amount < 0;
    });

    if (hasInvalidExtra) {
      nextErrors.extras =
        "Each extra row needs a label and a non-negative amount.";
    }

    return nextErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({
      entry_date: form.entry_date,
      physical_commission: parseAmount(form.physical_commission),
      physical_cash_capital: parseAmount(form.physical_cash_capital),
      electronic_commission: parseAmount(form.electronic_commission),
      electronic_cash_capital: parseAmount(form.electronic_cash_capital),
      notes: form.notes.trim(),
      extras: normalizedExtras.map((extra) => ({
        label: extra.label,
        amount: parseAmount(extra.amount),
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Daily Merchant Summary
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Entry Date"
            type="date"
            icon={Calendar}
            value={form.entry_date}
            onChange={(event) => setField("entry_date", event.target.value)}
            error={errors.entry_date}
            required
          />
          <Input
            label="Physical Commission"
            type="number"
            min="0"
            step="0.01"
            icon={DollarSign}
            value={form.physical_commission}
            onChange={(event) =>
              setField("physical_commission", event.target.value)
            }
            required
          />
          <Input
            label="Physical Cash Capital"
            type="number"
            min="0"
            step="0.01"
            icon={Wallet}
            value={form.physical_cash_capital}
            onChange={(event) =>
              setField("physical_cash_capital", event.target.value)
            }
            required
          />
          <Input
            label="Electronic Commission"
            type="number"
            min="0"
            step="0.01"
            icon={Smartphone}
            value={form.electronic_commission}
            onChange={(event) =>
              setField("electronic_commission", event.target.value)
            }
            required
          />
          <Input
            label="Electronic Cash Capital"
            type="number"
            min="0"
            step="0.01"
            icon={Landmark}
            value={form.electronic_cash_capital}
            onChange={(event) =>
              setField("electronic_cash_capital", event.target.value)
            }
            required
          />
        </div>

        {errors.amounts && (
          <p className="mt-3 text-xs text-danger">{errors.amounts}</p>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
            Extra Daily Amounts
          </p>
          <Button type="button" variant="outline" size="sm" onClick={addExtra}>
            <Plus size={14} className="mr-1.5" />
            Add Extra
          </Button>
        </div>

        <div className="space-y-3">
          {form.extras.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-surface-border bg-surface px-4 py-5 text-sm text-text-muted">
              No extra rows added for this day.
            </div>
          ) : (
            form.extras.map((extra, index) => (
              <div
                key={`extra-${index}`}
                className="grid grid-cols-1 gap-3 rounded-2xl border border-surface-border bg-surface p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]"
              >
                <Input
                  label={`Extra ${index + 1} Label`}
                  placeholder="Agent float top-up, transport, etc."
                  value={extra.label}
                  onChange={(event) =>
                    setExtraField(index, "label", event.target.value)
                  }
                />
                <Input
                  label="Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={extra.amount}
                  onChange={(event) =>
                    setExtraField(index, "amount", event.target.value)
                  }
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeExtra(index)}
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 size={16} />
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {errors.extras && (
          <p className="mt-3 text-xs text-danger">{errors.extras}</p>
        )}
      </div>

      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Notes
        </p>
        <textarea
          value={form.notes}
          onChange={(event) => setField("notes", event.target.value)}
          placeholder="Add any daily notes or reconciliations..."
          rows={4}
          className="w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="rounded-2xl border border-surface-border bg-surface p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
          Daily Totals Preview
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-surface-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
              Total Commission
            </p>
            <p className="mt-1 text-lg font-semibold text-text-primary">
              {formatCurrency(totals.totalCommission)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
              Extras Total
            </p>
            <p className="mt-1 text-lg font-semibold text-text-primary">
              {formatCurrency(totals.extrasTotal)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
              Capital Total
            </p>
            <p className="mt-1 text-lg font-semibold text-text-primary">
              {formatCurrency(
                totals.physicalCashCapital + totals.electronicCashCapital,
              )}
            </p>
          </div>
          <div className="rounded-xl bg-primary/10 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-primary/80">
              Grand Total Recorded
            </p>
            <p className="mt-1 text-lg font-semibold text-text-primary">
              {formatCurrency(grandTotal)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-surface-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? "Update Entry" : "Save Entry"}
        </Button>
      </div>
    </form>
  );
}
