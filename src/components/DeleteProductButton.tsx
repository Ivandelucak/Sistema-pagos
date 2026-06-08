"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function DeleteProductButton({
  productId,
  productName,
}: {
  productId: number;
  productName: string;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
      >
        Eliminar
      </button>

      {open && (
        <ConfirmDialog
          title="Eliminar producto"
          description={`¿Seguro que querés eliminar "${productName}"? El producto dejará de aparecer en el listado y no podrá usarse en nuevas cuentas, pero se conservará el historial asociado.`}
          confirmText="Eliminar"
          loading={loading}
          onConfirm={handleDelete}
          onCancel={() => {
            if (loading) return;
            setOpen(false);
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
