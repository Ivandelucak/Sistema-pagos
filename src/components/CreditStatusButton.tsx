//src/components/CreditStatusButton.tsx

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
  const [error, setError] = useState("");

  async function handleConfirm() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/creditos/${creditId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activo: !activo,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar la cuenta.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error al actualizar la cuenta.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
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
              ? "La cuenta se ocultará de los listados operativos, conservará su historial y, si tiene productos asociados, el stock se devolverá automáticamente."
              : "La cuenta volverá a aparecer en los listados operativos. Si tiene productos asociados, el sistema volverá a descontar stock y validará disponibilidad."
          }
          confirmText={activo ? "Dar de baja" : "Reactivar"}
          danger={activo}
          loading={loading}
          onConfirm={handleConfirm}
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
