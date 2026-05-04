"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function DeleteUserButton({
  userId,
  disabled,
}: {
  userId: number;
  disabled?: boolean;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/usuarios/${userId}`, {
      method: "DELETE",
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar el usuario.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400"
      >
        No eliminable
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-50 hover:shadow-md active:scale-[0.98]"
      >
        Eliminar
      </button>

      {open && (
        <ConfirmDialog
          title="Eliminar usuario"
          description="¿Seguro que querés eliminar definitivamente este usuario? Solo se podrá eliminar si no tiene clientes, cuentas o pagos asociados."
          confirmText="Eliminar"
          danger
          loading={loading}
          onConfirm={handleDelete}
          onCancel={() => {
            setOpen(false);
            setError("");
          }}
        />
      )}

      {error && (
        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-sm font-medium text-red-700">
          {error}
        </div>
      )}
    </>
  );
}
