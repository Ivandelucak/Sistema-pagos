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
        className={`rounded-lg px-4 py-2 text-sm font-medium ${
          activo
            ? "border border-red-300 bg-white text-red-600 hover:bg-red-50"
            : "bg-green-600 text-white hover:bg-green-700"
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
