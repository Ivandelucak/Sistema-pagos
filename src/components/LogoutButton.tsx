"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(false);
    setOpen(false);
    setError("");
  }, [pathname]);

  if (pathname === "/login") {
    return null;
  }

  async function handleLogout() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!res.ok) {
        setError("No se pudo cerrar sesión.");
        setLoading(false);
        return;
      }

      setOpen(false);
      setLoading(false);

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Ocurrió un error al cerrar sesión.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading}
        className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Cerrar sesión
      </button>

      {open && (
        <div className="fixed inset-0 z-9999 grid min-h-screen place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-950">
              <span className="hidden sm:inline">Cerrar sesión</span>
              <span className="sm:hidden">Salir</span>
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              ¿Seguro que querés cerrar la sesión actual? Vas a tener que volver
              a ingresar con tu usuario y contraseña para usar el sistema.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Cerrando..." : "Sí, cerrar sesión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
