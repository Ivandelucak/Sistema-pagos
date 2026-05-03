"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export default function CreditStatusButton({
  creditId,
  activo,
}: {
  creditId: number;
  activo: boolean;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);

    await fetch(`/api/creditos/${creditId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        activo: !activo,
      }),
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
          activo
            ? "border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50"
            : "border border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
        }`}
      >
        {activo ? "Dar de baja cuenta" : "Reactivar cuenta"}
      </button>

      {open && (
        <ConfirmDialog
          title={activo ? "Dar de baja cuenta" : "Reactivar cuenta"}
          description={
            activo
              ? "La cuenta se ocultará de los listados operativos, pero conservará su historial, pagos y datos."
              : "La cuenta volverá a aparecer en los listados operativos."
          }
          confirmText={activo ? "Dar de baja" : "Reactivar"}
          danger={activo}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
