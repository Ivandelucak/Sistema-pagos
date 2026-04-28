"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NuevoClienteForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      ...form,
      vendedorId: 2, // después será dinámico por login
    };

    if (!payload.nombre.trim()) {
      setError("Ingresá el nombre del cliente.");
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
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre"
        name="nombre"
        value={form.nombre}
        onChange={handleChange}
        placeholder="Ej: Juan Pérez"
      />

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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-900 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear cliente"}
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
