"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type UserRole = "ADMIN" | "VENDEDOR";

export default function NuevoUsuarioForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "VENDEDOR" as UserRole,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanEmail = form.email.trim().toLowerCase();

  const resumen = useMemo(() => {
    return {
      nombre: form.nombre.trim() || "-",
      email: cleanEmail || "-",
      rol: form.rol === "ADMIN" ? "Administrador" : "Vendedor",
      estado: "Activo",
    };
  }, [form.nombre, cleanEmail, form.rol]);

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
      email: cleanEmail,
      password: form.password,
      rol: form.rol,
    };

    if (!payload.nombre) {
      setError("Ingresá el nombre del usuario.");
      return;
    }

    if (!payload.email) {
      setError("Ingresá el email del usuario.");
      return;
    }

    if (!payload.email.includes("@")) {
      setError("Ingresá un email válido.");
      return;
    }

    if (payload.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (payload.rol !== "ADMIN" && payload.rol !== "VENDEDOR") {
      setError("Seleccioná un rol válido.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el usuario.");
      return;
    }

    router.push("/usuarios");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          Datos del usuario
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Completá los datos de acceso y el rol que tendrá dentro del sistema.
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
            placeholder="Ej: Nico"
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Ej: nico.cobrador@credifer"
            autoComplete="username"
          />

          <Input
            label="Contraseña provisoria"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <label className="text-sm font-medium text-slate-700">Rol</label>

        <select
          name="rol"
          value={form.rol}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
        >
          <option value="VENDEDOR">Vendedor</option>
          <option value="ADMIN">Administrador</option>
        </select>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Los vendedores consultan su cartera asignada. Los administradores
          pueden modificar datos y gestionar usuarios.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-sm font-medium text-slate-400">
          Resumen del usuario
        </p>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <SummaryItem label="Nombre" value={resumen.nombre} />
          <SummaryItem label="Email" value={resumen.email} />
          <SummaryItem label="Rol" value={resumen.rol} />
          <SummaryItem label="Estado" value={resumen.estado} />
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
        {loading ? "Creando usuario..." : "Crear usuario"}
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
