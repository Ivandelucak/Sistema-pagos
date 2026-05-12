"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function EditClientButton({
  clientId,
  initialNombre,
  initialTelefono,
  initialDireccion,
}: {
  clientId: number;
  initialNombre: string;
  initialTelefono: string;
  initialDireccion: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [nombre, setNombre] = useState(initialNombre);
  const [telefono, setTelefono] = useState(initialTelefono);
  const [direccion, setDireccion] = useState(initialDireccion);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/clientes/${clientId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre,
        telefono,
        direccion,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo editar el cliente.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
      >
        Editar cliente
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-950">
              Editar cliente
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Modificá los datos principales del cliente.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <Input
                label="Nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />

              <Input
                label="Teléfono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />

              <Input
                label="Dirección"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError("");
                    setNombre(initialNombre);
                    setTelefono(initialTelefono);
                    setDireccion(initialDireccion);
                  }}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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
