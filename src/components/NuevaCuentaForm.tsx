"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function getTodayInputValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  });
}

function formatInputDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return "-";

  return new Date(year, month - 1, day).toLocaleDateString("es-AR");
}

export default function NuevaCuentaForm({
  clientId,
  clienteNombre,
  vendedorId,
  vendedorNombre,
}: {
  clientId: number;
  clienteNombre: string;
  vendedorId: number;
  vendedorNombre: string;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    tipo: "",
    fechaInicio: getTodayInputValue(),
    frecuenciaDias: "7",
    total: "",
    cantidadCuotas: "",
  });

  const total = Number(form.total);
  const cantidadCuotas = Number(form.cantidadCuotas);
  const frecuenciaDias = Number(form.frecuenciaDias);

  const valorCuota = useMemo(() => {
    if (
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isInteger(cantidadCuotas) ||
      cantidadCuotas <= 0
    ) {
      return 0;
    }

    return total / cantidadCuotas;
  }, [total, cantidadCuotas]);

  const resumenValido =
    form.fechaInicio &&
    Number.isFinite(total) &&
    total > 0 &&
    Number.isInteger(cantidadCuotas) &&
    cantidadCuotas > 0 &&
    Number.isInteger(frecuenciaDias) &&
    frecuenciaDias > 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      clientId,
      vendedorId,
      tipo: form.tipo.trim(),
      fechaInicio: form.fechaInicio,
      frecuenciaDias: Number(form.frecuenciaDias),
      total: Number(form.total),
      cantidadCuotas: Number(form.cantidadCuotas),
    };

    if (!payload.tipo) {
      setError("Ingresá el tipo de cuenta.");
      return;
    }

    if (!payload.fechaInicio) {
      setError("Ingresá la fecha inicial.");
      return;
    }

    if (
      !Number.isInteger(payload.frecuenciaDias) ||
      payload.frecuenciaDias <= 0
    ) {
      setError("La frecuencia debe ser mayor a 0.");
      return;
    }

    if (!Number.isFinite(payload.total) || payload.total <= 0) {
      setError("El total debe ser mayor a 0.");
      return;
    }

    if (
      !Number.isInteger(payload.cantidadCuotas) ||
      payload.cantidadCuotas <= 0
    ) {
      setError("La cantidad de cuotas debe ser mayor a 0.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/creditos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al crear cuenta.");
      return;
    }

    router.push(`/cuentas/${data.creditId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          Datos de la cuenta
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Cliente:{" "}
          <span className="font-medium text-slate-700">{clienteNombre}</span> ·
          Vendedor:{" "}
          <span className="font-medium text-slate-700">{vendedorNombre}</span>
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">
          Información principal
        </p>

        <div className="mt-4 space-y-4">
          <Input
            label="Tipo de cuenta"
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            placeholder="Ej: crédito, producto, préstamo"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Fecha inicial"
              name="fechaInicio"
              type="date"
              value={form.fechaInicio}
              onChange={handleChange}
            />

            <Input
              label="Frecuencia de cobro (días)"
              name="frecuenciaDias"
              type="number"
              min="1"
              step="1"
              value={form.frecuenciaDias}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">
          Condiciones de pago
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="Total"
            name="total"
            type="number"
            min="1"
            step="1"
            value={form.total}
            onChange={handleChange}
            placeholder="Ej: 70000"
          />

          <Input
            label="Cantidad de cuotas"
            name="cantidadCuotas"
            type="number"
            min="1"
            step="1"
            value={form.cantidadCuotas}
            onChange={handleChange}
            placeholder="Ej: 7"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">
              Valor de cuota calculado
            </p>

            <p className="mt-1 text-3xl font-bold text-white">
              ${formatCurrency(valorCuota)}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Se calcula automáticamente según total y cantidad de cuotas.
            </p>
          </div>

          <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10 md:min-w-56">
            <p className="text-sm text-slate-300">Vista previa</p>

            <div className="mt-2 space-y-1 text-sm">
              <p>
                Total:{" "}
                <span className="font-semibold text-white">
                  $
                  {Number.isFinite(total) && total > 0
                    ? formatCurrency(total)
                    : "0"}
                </span>
              </p>

              <p>
                Cuotas:{" "}
                <span className="font-semibold text-white">
                  {Number.isInteger(cantidadCuotas) && cantidadCuotas > 0
                    ? cantidadCuotas
                    : "-"}
                </span>
              </p>

              <p>
                Frecuencia:{" "}
                <span className="font-semibold text-white">
                  {Number.isInteger(frecuenciaDias) && frecuenciaDias > 0
                    ? `${frecuenciaDias} días`
                    : "-"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Resumen de carga</p>

        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
          <SummaryItem label="Cliente" value={clienteNombre} />
          <SummaryItem label="Vendedor" value={vendedorNombre} />
          <SummaryItem
            label="Fecha inicial"
            value={formatInputDate(form.fechaInicio)}
          />
          <SummaryItem
            label="Estado"
            value={resumenValido ? "Listo para crear" : "Datos incompletos"}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 py-3 font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
