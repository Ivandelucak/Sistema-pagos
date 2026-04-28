"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function NuevaCuentaForm({ clientId }: { clientId: number }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    tipo: "",
    fechaInicio: "",
    frecuenciaDias: "7",
    total: "",
    cantidadCuotas: "",
  });

  const total = Number(form.total);
  const cantidadCuotas = Number(form.cantidadCuotas);

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      clientId,
      vendedorId: 2,
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
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Tipo"
        name="tipo"
        value={form.tipo}
        onChange={handleChange}
        placeholder="Ej: cred"
      />

      <Input
        label="Fecha inicio"
        name="fechaInicio"
        type="date"
        value={form.fechaInicio}
        onChange={handleChange}
      />

      <Input
        label="Frecuencia (días)"
        name="frecuenciaDias"
        type="number"
        min="1"
        step="1"
        value={form.frecuenciaDias}
        onChange={handleChange}
      />

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

      <div className="rounded-xl bg-slate-100 p-4">
        <p className="text-sm text-slate-500">Valor de cuota calculado</p>
        <p className="mt-1 text-xl font-bold text-slate-900">
          ${valorCuota.toLocaleString("es-AR", { maximumFractionDigits: 2 })}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear cuenta"}
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
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
      />
    </div>
  );
}
