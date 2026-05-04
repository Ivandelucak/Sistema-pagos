"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type CurrentUser = {
  id: number;
  nombre: string;
  email: string;
  rol: "ADMIN" | "VENDEDOR";
};

export default function UserMenu({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = user.rol === "ADMIN";

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

  async function handleLogout() {
    setLoading(true);

    const res = await fetch("/api/auth/logout", {
      method: "POST",
    });

    setLoading(false);

    if (!res.ok) return;

    setConfirmLogout(false);
    setOpen(false);

    router.replace("/login");
    router.refresh();
  }

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
              }}
              className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {confirmLogout && (
        <ConfirmDialog
          title="Cerrar sesión"
          description="¿Seguro que querés cerrar la sesión actual? Vas a tener que volver a ingresar con tu usuario y contraseña."
          confirmText="Cerrar sesión"
          loading={loading}
          onConfirm={handleLogout}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </div>
  );
}
