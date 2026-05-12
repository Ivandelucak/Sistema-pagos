"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Vendedor = {
  id: number;
  nombre: string;
};

type CreditData = {
  id: number;
  tipo: string;
  fechaInicio: string;
  frecuenciaDias: number;
  total: number;
  cantidadCuotas: number;
  montoPagado: number;
  vendedorId: number;
};

export default function EditCreditButton({
  credit,
  vendedores,
}: {
  credit: CreditData;
  vendedores: Vendedor[];
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState(credit.tipo);
  const [fechaInicio, setFechaInicio] = useState(credit.fechaInicio);
  const [frecuenciaDias, setFrecuenciaDias] = useState(
    String(credit.frecuenciaDias),
  );
  const [total, setTotal] = useState(String(credit.total));
  const [cantidadCuotas, setCantidadCuotas] = useState(
    String(credit.cantidadCuotas),
  );
  const [vendedorId, setVendedorId] = useState(String(credit.vendedorId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const valorCuota = useMemo(() => {
    const parsedTotal = Number(total);
    const parsedCuotas = Number(cantidadCuotas);

    if (
      !Number.isFinite(parsedTotal) ||
      parsedTotal <= 0 ||
      !Number.isInteger(parsedCuotas) ||
      parsedCuotas <= 0
    ) {
      return 0;
    }

    return parsedTotal / parsedCuotas;
  }, [total, cantidadCuotas]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    const payload = {
      tipo: tipo.trim(),
      fechaInicio,
      frecuenciaDias: Number(frecuenciaDias),
      total: Number(total),
      cantidadCuotas: Number(cantidadCuotas),
      vendedorId: Number(vendedorId),
    };

    if (!payload.tipo) {
      setError("Ingresá el tipo de cuenta.");
      return;
    }

    if (!payload.fechaInicio) {
      setError("Ingresá la fecha inicial.");
      return;
    }

    if (
      !Number.isInteger(payload.frecuenciaDias) ||
      payload.frecuenciaDias <= 0
    ) {
      setError("La frecuencia debe ser mayor a 0.");
      return;
    }

    if (!Number.isFinite(payload.total) || payload.total <= 0) {
      setError("El total debe ser mayor a 0.");
      return;
    }

    if (payload.total < credit.montoPagado) {
      setError("El total no puede ser menor al monto ya pagado.");
      return;
    }

    if (
      !Number.isInteger(payload.cantidadCuotas) ||
      payload.cantidadCuotas <= 0
    ) {
      setError("La cantidad de cuotas debe ser mayor a 0.");
      return;
    }

    if (!Number.isInteger(payload.vendedorId)) {
      setError("Seleccioná un vendedor válido.");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/creditos/${credit.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo editar la cuenta.");
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
      >
        Editar cuenta
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto flex min-h-dvh w-full max-w-xl items-center">
            <div className="w-full rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
              <h2 className="text-lg font-semibold text-slate-950">
                Editar cuenta
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Los cambios recalculan saldo, cuotas y próximo vencimiento.
              </p>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                <Input
                  label="Tipo de cuenta"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Fecha inicial"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />

                  <Input
                    label="Frecuencia de cobro"
                    type="number"
                    min={1}
                    value={frecuenciaDias}
                    onChange={(e) => setFrecuenciaDias(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Total"
                    type="number"
                    min={1}
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                  />

                  <Input
                    label="Cantidad de cuotas"
                    type="number"
                    min={1}
                    value={cantidadCuotas}
                    onChange={(e) => setCantidadCuotas(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Vendedor de la cuenta
                  </label>

                  <select
                    value={vendedorId}
                    onChange={(e) => setVendedorId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                  >
                    {vendedores.map((vendedor) => (
                      <option key={vendedor.id} value={vendedor.id}>
                        {vendedor.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                  <p className="text-sm font-medium text-slate-500">
                    Valor de cuota recalculado
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    ${valorCuota.toLocaleString("es-AR")}
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
                    onClick={() => {
                      setOpen(false);
                      setError("");
                    }}
                    disabled={loading}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {loading ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
      />
    </div>
  );
}
