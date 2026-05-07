"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function LogoutButton() {
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLoading(false);
    setOpen(false);
    setError("");
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        setOpen(false);
        setError("");
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, loading]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (pathname === "/login") {
    return null;
  }

  async function handleLogout() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!res.ok) {
        setError("No se pudo cerrar sesión.");
        setLoading(false);
        return;
      }

      window.location.replace("/login");
    } catch {
      setError("Ocurrió un error al cerrar sesión.");
      setLoading(false);
    }
  }

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div
              className="absolute inset-0"
              onClick={() => {
                if (!loading) {
                  setOpen(false);
                  setError("");
                }
              }}
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-title"
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
            >
              <h2
                id="logout-title"
                className="text-lg font-semibold text-slate-950"
              >
                Cerrar sesión
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                ¿Seguro que querés cerrar la sesión actual? Vas a tener que
                volver a ingresar con tu usuario y contraseña para usar el
                sistema.
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
          </div>,
          document.body,
        )
      : null;

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

      {modal}
    </>
  );
}
