"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export default function DeletePaymentButton({
  paymentId,
}: {
  paymentId: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);

    await fetch(`/api/pagos/${paymentId}`, {
      method: "DELETE",
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-red-600 hover:underline"
      >
        Eliminar
      </button>

      {open && (
        <ConfirmDialog
          title="Eliminar cobro"
          description="¿Seguro que querés eliminar este cobro? El saldo, cuotas y vencimiento se recalcularán automáticamente."
          confirmText="Eliminar"
          danger
          loading={loading}
          onConfirm={handleDelete}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
