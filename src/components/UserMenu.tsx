"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CurrentUser = {
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "VENDEDOR";
};

export default function UserMenu({ user }: { user: CurrentUser }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user.rol === "ADMIN";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!confirmLogout) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        setConfirmLogout(false);
        setError("");
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [confirmLogout, loading]);

  useEffect(() => {
    if (!confirmLogout) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [confirmLogout]);

  async function handleLogout() {
    if (loading) return;

    setLoading(true);
    setError("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });

      window.clearTimeout(timeout);

      if (!res.ok) {
        setError("No se pudo cerrar sesión. Probá nuevamente.");
        setLoading(false);
        return;
      }

      window.location.replace("/login");
    } catch {
      window.clearTimeout(timeout);
      setError("No se pudo cerrar sesión. Probá nuevamente.");
      setLoading(false);
    }
  }

  const logoutModal =
    mounted && confirmLogout
      ? createPortal(
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Cerrar modal"
              className="absolute inset-0 cursor-default"
              disabled={loading}
              onClick={() => {
                setConfirmLogout(false);
                setError("");
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
                  disabled={loading}
                  onClick={() => {
                    setConfirmLogout(false);
                    setError("");
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleLogout}
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
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-100 hover:text-slate-900"
      >
        Usuario
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-950">
              {user.nombre}
            </p>

            <p className="mt-1 truncate text-xs text-slate-500">{user.email}</p>

            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
              {isAdmin ? "Administrador" : "Vendedor"}
            </span>
          </div>

          <div className="p-2">
            {isAdmin ? (
              <Link
                href="/usuarios"
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
              >
                Administración de usuarios
              </Link>
            ) : (
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-slate-700">
                  Modo consulta
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Tu usuario solo puede consultar la cartera asignada. Los
                  cambios los realiza administración.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
                setError("");
              }}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {logoutModal}
    </div>
  );
}
