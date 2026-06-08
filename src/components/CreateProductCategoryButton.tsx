"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CreateProductCategoryButton({
  nextCodePrefix,
}: {
  nextCodePrefix: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [codePrefix, setCodePrefix] = useState(nextCodePrefix);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function closeModal() {
    if (loading) return;

    setOpen(false);
    setName("");
    setCodePrefix(nextCodePrefix);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanCode = codePrefix.trim();

    if (!cleanName) {
      setError("Ingresá el nombre de la categoría.");
      return;
    }

    if (!/^\d{3}$/.test(cleanCode)) {
      setError("El código debe tener exactamente 3 dígitos. Ej: 014");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/productos/categorias", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: cleanName,
        codePrefix: cleanCode,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo crear la categoría.");
      return;
    }

    setOpen(false);
    setName("");
    setCodePrefix(nextCodePrefix);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCodePrefix(nextCodePrefix);
          setError("");
          setOpen(true);
        }}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:translate-y-0 active:scale-[0.98]"
      >
        Nueva categoría
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex min-h-dvh w-full max-w-lg items-center">
            <div className="w-full rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <h2 className="text-xl font-semibold text-slate-950">
                Nueva categoría
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Creá una categoría interna para organizar productos y generar
                códigos automáticos del estilo 014-0001.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Código de categoría
                  </label>

                  <input
                    value={codePrefix}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 3);
                      setCodePrefix(value);
                      setError("");
                    }}
                    placeholder="Ej: 014"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Este código será el prefijo de los productos. Ej:{" "}
                    <span className="font-semibold text-slate-700">
                      {codePrefix || "014"}-0001
                    </span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Nombre
                  </label>

                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    placeholder="Ej: Motos"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Creando..." : "Crear categoría"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
