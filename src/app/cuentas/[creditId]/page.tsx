import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RegistrarCobroButton from "@/components/RegistrarCobroButton";
import DeletePaymentButton from "@/components/DeletePaymentButton";
import EditPaymentButton from "@/components/EditPaymentButton";
import CreditStatusButton from "@/components/CreditStatusButton";
import { calculateCreditTracking } from "@/lib/credit-calculations";
import { requireUser } from "@/lib/auth";

export default async function CuentaPage({
  params,
}: {
  params: Promise<{ creditId: string }>;
}) {
  const { creditId } = await params;
  const id = Number(creditId);
  const user = await requireUser();

  if (!Number.isInteger(id)) {
    return <StateMessage title="Cuenta inválida" />;
  }

  const credito = await prisma.credit.findUnique({
    where: { id },
    include: {
      client: true,
      payments: {
        orderBy: {
          fechaPago: "desc",
        },
      },
    },
  });

  if (!credito) {
    return <StateMessage title="Cuenta no encontrada" />;
  }

  const tracking = calculateCreditTracking({
    fechaInicio: credito.fechaInicio,
    frecuenciaDias: credito.frecuenciaDias,
    valorCuota: credito.valorCuota,
    total: credito.total,
    montoPagado: credito.montoPagado,
  });

  const isPaid = tracking.saldo <= 0;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href={`/clientes/${credito.client.id}`}
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Volver al cliente
            </Link>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {credito.client.nombre}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                label={isPaid ? "PAGADO" : tracking.estado}
                variant={
                  isPaid
                    ? "success"
                    : tracking.estado === "VENCIDO"
                      ? "danger"
                      : "default"
                }
              />
              <span className="text-sm text-slate-500">
                Cuenta #{credito.id}
              </span>
            </div>
          </div>

          {user.rol === "ADMIN" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <RegistrarCobroButton
                creditId={credito.id}
                saldo={tracking.saldo}
              />
              <CreditStatusButton
                creditId={credito.id}
                activo={credito.activo}
              />
            </div>
          )}
          {!credito.activo && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800">
              Esta cuenta está dada de baja. No aparecerá en los listados
              operativos.
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card title="Total" value={credito.total} />
          <Card title="Pagado" value={credito.montoPagado} />
          <Card title="Saldo" value={tracking.saldo} highlight={!isPaid} />
          <Card title="Cuota" value={credito.valorCuota} />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Datos de la cuenta
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Información operativa calculada a partir de fecha, frecuencia,
                total y pagos registrados.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Info
              label="Fecha inicial"
              value={credito.fechaInicio.toLocaleDateString("es-AR")}
            />
            <Info label="Tipo" value={credito.tipo} />
            <Info label="Frecuencia" value={`${credito.frecuenciaDias} días`} />
            <Info
              label="Próximo vencimiento"
              value={tracking.proximoVencimiento.toLocaleDateString("es-AR")}
            />
            <Info
              label="DPV / Días para vencer"
              value={String(tracking.diasParaVencer)}
              danger={tracking.diasParaVencer < 0}
            />
            <Info label="Estado" value={isPaid ? "PAGADO" : tracking.estado} />
            <Info
              label="Cuotas pagadas"
              value={String(tracking.cuotasPagadas)}
            />
            <Info
              label="Cuotas restantes"
              value={String(tracking.cuotasRestantes)}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Movimientos
              </h2>
              <p className="text-sm text-slate-500">
                Historial de cobros registrados para esta cuenta.
              </p>
            </div>

            <span className="text-sm font-medium text-slate-600">
              {credito.payments.length} movimiento
              {credito.payments.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200 text-slate-600">
                  <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold">Monto</th>
                  {user.rol === "ADMIN" && (
                    <th className="px-4 py-3 text-right font-semibold">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {credito.payments.map((pago) => (
                  <tr key={pago.id} className="bg-white hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {pago.fechaPago.toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-950">
                      ${pago.monto.toLocaleString("es-AR")}
                    </td>
                    {user.rol === "ADMIN" && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-3">
                          <EditPaymentButton
                            paymentId={pago.id}
                            currentAmount={pago.monto}
                          />
                          <DeletePaymentButton paymentId={pago.id} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {credito.payments.length === 0 && (
              <div className="bg-white px-4 py-8 text-center text-sm text-slate-500">
                Sin movimientos registrados.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({
  title,
  value,
  highlight,
}: {
  title: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p
        className={`mt-2 text-2xl font-bold ${
          highlight ? "text-red-600" : "text-slate-950"
        }`}
      >
        ${value.toLocaleString("es-AR")}
      </p>
    </div>
  );
}

function Info({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1 font-semibold ${
          danger ? "text-red-600" : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Badge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "danger" | "success";
}) {
  const styles = {
    default: "bg-slate-200 text-slate-800",
    danger: "bg-red-100 text-red-700",
    success: "bg-green-100 text-green-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${styles[variant]}`}
    >
      {label}
    </span>
  );
}

function StateMessage({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 text-slate-900 shadow-sm">
        {title}
      </div>
    </main>
  );
}
