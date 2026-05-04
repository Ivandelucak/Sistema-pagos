"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function UserStatusButton({
  userId,
  activo,
  disabled,
}: {
  userId: number;
  activo: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChangeStatus() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/usuarios/${userId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        activo: !activo,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo modificar el usuario.");
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
        No modificable
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
          activo
            ? "border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50"
            : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
        }`}
      >
        {activo ? "Desactivar" : "Activar"}
      </button>

      {open && (
        <ConfirmDialog
          title={activo ? "Desactivar usuario" : "Activar usuario"}
          description={
            activo
              ? "¿Seguro que querés desactivar este usuario? No podrá ingresar al sistema, pero sus registros se conservan."
              : "¿Seguro que querés activar este usuario? Podrá volver a ingresar al sistema."
          }
          confirmText={activo ? "Desactivar" : "Activar"}
          danger={activo}
          loading={loading}
          onConfirm={handleChangeStatus}
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
