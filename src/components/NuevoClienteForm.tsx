"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type VendedorOption = {
  id: number;
  nombre: string;
};

type ClienteSuggestion = {
  id: number;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  vendedorNombre: string;
  cuentasActivas: number;
};

type DuplicateClient = {
  id: number;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  vendedorNombre: string;
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

  const [suggestions, setSuggestions] = useState<ClienteSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateClient | null>(null);
  const [forceCreate, setForceCreate] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const vendedorSeleccionado = useMemo(() => {
    const id = Number(form.vendedorId);

    if (!Number.isInteger(id)) return null;

    return vendedores.find((vendedor) => vendedor.id === id) ?? null;
  }, [form.vendedorId, vendedores]);

  useEffect(() => {
    const nombre = form.nombre.trim();

    setDuplicate(null);
    setForceCreate(false);

    if (nombre.length < 3) {
      setSuggestions([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      try {
        setSearching(true);

        const res = await fetch(
          `/api/clientes/sugerencias?q=${encodeURIComponent(nombre)}`,
        );

        if (!res.ok) {
          setSuggestions([]);
          return;
        }

        const data = await res.json();

        setSuggestions(data.clientes ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [form.nombre]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDuplicate(null);

    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      direccion: form.direccion.trim(),
      vendedorId: Number(form.vendedorId),
      force: forceCreate,
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

    if (res.status === 409 && data.duplicate) {
      setDuplicate(data.duplicate);
      setError(data.error ?? "Ya existe un cliente con ese nombre.");
      return;
    }

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

          {form.nombre.trim().length >= 3 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800">
                  Coincidencias encontradas
                </p>

                {searching && (
                  <span className="text-xs font-medium text-slate-500">
                    Buscando...
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {suggestions.length > 0
                  ? suggestions.map((cliente) => (
                      <Link
                        key={cliente.id}
                        href={`/clientes/${cliente.id}`}
                        className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-slate-950">
                              {cliente.nombre}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Vendedor: {cliente.vendedorNombre}
                            </p>

                            {(cliente.telefono || cliente.direccion) && (
                              <p className="mt-1 text-xs text-slate-500">
                                {[cliente.telefono, cliente.direccion]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                              {cliente.cuentasActivas} cuenta
                              {cliente.cuentasActivas === 1 ? "" : "s"} activa
                              {cliente.cuentasActivas === 1 ? "" : "s"}
                            </span>

                            <span className="text-sm font-semibold text-slate-700">
                              Ver →
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))
                  : !searching && (
                      <p className="text-sm text-slate-500">
                        No hay coincidencias visibles para este nombre.
                      </p>
                    )}
              </div>
            </div>
          )}

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

      {duplicate && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            Ya existe un cliente con ese nombre.
          </p>

          <p className="mt-2 text-sm leading-6 text-red-700">
            {duplicate.nombre} · Vendedor: {duplicate.vendedorNombre}
          </p>

          {(duplicate.telefono || duplicate.direccion) && (
            <p className="mt-1 text-sm text-red-700">
              {[duplicate.telefono, duplicate.direccion]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/clientes/${duplicate.id}`}
              className="rounded-xl bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white transition-all hover:bg-red-700"
            >
              Ir al cliente existente
            </Link>

            <button
              type="button"
              onClick={() => {
                setForceCreate(true);
                setDuplicate(null);
                setError("");
              }}
              className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
            >
              Crear de todos modos
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Importante</p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          El cliente quedará vinculado al vendedor seleccionado. Las cuentas que
          se creen posteriormente para este cliente tomarán esa asignación,
          salvo que administración las reasigne.
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
        {loading
          ? "Creando cliente..."
          : forceCreate
            ? "Crear cliente de todos modos"
            : "Crear cliente"}
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
