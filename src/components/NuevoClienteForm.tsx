"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type VendedorOption = {
  id: number;
  nombre: string;
};

export default function NuevoClienteForm({
  vendedores,
}: {
  vendedores: VendedorOption[];
}) {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    vendedorId: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const vendedorSeleccionado = useMemo(() => {
    const id = Number(form.vendedorId);

    if (!Number.isInteger(id)) return null;

    return vendedores.find((vendedor) => vendedor.id === id) ?? null;
  }, [form.vendedorId, vendedores]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      direccion: form.direccion.trim(),
      vendedorId: Number(form.vendedorId),
    };

    if (!payload.nombre) {
      setError("Ingresá el nombre del cliente.");
      return;
    }

    if (!Number.isInteger(payload.vendedorId)) {
      setError("Seleccioná un vendedor.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el cliente.");
      return;
    }

    router.push(`/clientes/${data.clientId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          Datos del cliente
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Completá la información principal y elegí el vendedor responsable.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">
          Información principal
        </p>

        <div className="mt-4 space-y-4">
          <Input
            label="Nombre"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: Juan Pérez"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Teléfono"
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              placeholder="Ej: 221..."
            />

            <Input
              label="Dirección"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              placeholder="Ej: Calle, número, barrio"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">Vendedor asignado</p>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">
            Seleccionar vendedor
          </label>

          <select
            name="vendedorId"
            value={form.vendedorId}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
          >
            <option value="">Seleccionar vendedor...</option>

            {vendedores.map((vendedor) => (
              <option key={vendedor.id} value={vendedor.id}>
                {vendedor.nombre}
              </option>
            ))}
          </select>

          {vendedores.length === 0 && (
            <p className="mt-2 text-sm font-medium text-red-600">
              No hay vendedores activos cargados.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-sm font-medium text-slate-400">
          Resumen de asignación
        </p>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <SummaryItem label="Cliente" value={form.nombre.trim() || "-"} />
          <SummaryItem
            label="Vendedor"
            value={vendedorSeleccionado?.nombre ?? "-"}
          />
          <SummaryItem label="Teléfono" value={form.telefono.trim() || "-"} />
          <SummaryItem label="Dirección" value={form.direccion.trim() || "-"} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Importante</p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          El cliente quedará vinculado al vendedor seleccionado. Las cuentas que
          se creen posteriormente para este cliente tomarán esa asignación.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || vendedores.length === 0}
        className="w-full rounded-xl bg-slate-900 py-3 font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creando cliente..." : "Crear cliente"}
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
    <div className="rounded-lg bg-white/10 p-3 ring-1 ring-white/10">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}
