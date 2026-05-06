"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type Vendedor = {
  id: number;
  nombre: string;
};

export default function TransferClientVendorButton({
  clientId,
  currentVendorId,
  currentVendorName,
  vendedores,
}: {
  clientId: number;
  currentVendorId: number;
  currentVendorName: string;
  vendedores: Vendedor[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [vendedorId, setVendedorId] = useState(String(currentVendorId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedVendor = useMemo(() => {
    const id = Number(vendedorId);

    return vendedores.find((vendedor) => vendedor.id === id) ?? null;
  }, [vendedorId, vendedores]);

  const sameVendor = Number(vendedorId) === currentVendorId;

  function closeModal() {
    if (loading) return;

    setOpen(false);
    setConfirmOpen(false);
    setVendedorId(String(currentVendorId));
    setError("");
  }

  function askConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedVendor) {
      setError("Seleccioná un vendedor válido.");
      return;
    }

    if (sameVendor) {
      setError("El cliente ya pertenece a ese vendedor.");
      return;
    }

    setConfirmOpen(true);
  }

  async function handleTransfer() {
    if (!selectedVendor) return;

    setLoading(true);
    setError("");

    const res = await fetch(`/api/clientes/${clientId}/transferir-vendedor`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vendedorId: selectedVendor.id,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo traspasar el cliente.");
      setConfirmOpen(false);
      return;
    }

    setConfirmOpen(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
      >
        Cambiar vendedor
      </button>

      {open && (
        <div className="fixed inset-0 z-40 grid min-h-screen place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-xl font-semibold text-slate-950">
                Cambiar vendedor del cliente
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                El cliente y todas sus cuentas pasarán al vendedor seleccionado.
              </p>
            </div>

            <form onSubmit={askConfirm} className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoCard label="Vendedor actual" value={currentVendorName} />
                <InfoCard
                  label="Nuevo vendedor"
                  value={selectedVendor?.nombre ?? "-"}
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <label className="text-sm font-medium text-slate-700">
                  Seleccionar vendedor
                </label>

                <select
                  value={vendedorId}
                  onChange={(e) => {
                    setVendedorId(e.target.value);
                    setError("");
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                >
                  {vendedores.map((vendedor) => (
                    <option key={vendedor.id} value={vendedor.id}>
                      {vendedor.nombre}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Para mantener consistencia, también se actualizan las cuentas
                  asociadas al cliente.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmOpen && selectedVendor && (
        <ConfirmDialog
          title="Confirmar traspaso"
          description={`¿Querés pasar este cliente de ${currentVendorName} a ${selectedVendor.nombre}? También se actualizarán sus cuentas.`}
          confirmText="Confirmar traspaso"
          loading={loading}
          onConfirm={handleTransfer}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}
