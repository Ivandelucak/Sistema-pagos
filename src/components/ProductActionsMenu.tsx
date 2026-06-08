"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ProductActionsMenu({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function openMenu() {
    const rect = buttonRef.current?.getBoundingClientRect();

    if (rect) {
      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 176,
      });
    }

    setError("");
    setOpen(true);
  }

  async function handleDelete() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/productos/${productId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar el producto.");
      return;
    }

    setConfirmOpen(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openMenu();
          }
        }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-xl font-bold text-slate-700 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:translate-y-0 active:scale-95"
        aria-label="Acciones del producto"
      >
        ⋯
      </button>

      {open &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Cerrar menú"
              className="fixed inset-0 z-[9998] cursor-default bg-transparent"
              onClick={() => setOpen(false)}
            />

            <div
              className="fixed z-[9999] w-44 origin-top-right overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 animate-menu-pop"
              style={{
                top: position.top,
                left: Math.max(position.left, 8),
              }}
            >
              <Link
                href={`/productos/${productId}/editar`}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-slate-700 transition-all duration-150 hover:bg-slate-100 hover:pl-5 hover:text-slate-950 active:bg-slate-200"
              >
                Editar producto
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirmOpen(true);
                }}
                className="block w-full px-4 py-3 text-left text-sm font-medium text-red-600 transition-all duration-150 hover:bg-red-50 hover:pl-5 hover:text-red-700 active:bg-red-100"
              >
                Eliminar producto
              </button>
            </div>
          </>,
          document.body,
        )}

      {confirmOpen && (
        <ConfirmDialog
          title="Eliminar producto"
          description={`¿Seguro que querés eliminar "${productName}"? El producto dejará de aparecer en el listado y no podrá usarse en nuevas cuentas, pero se conservará el historial asociado.`}
          confirmText="Eliminar"
          loading={loading}
          onConfirm={handleDelete}
          onCancel={() => {
            if (loading) return;
            setConfirmOpen(false);
            setError("");
          }}
        />
      )}

      {error && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
    </>
  );
}
