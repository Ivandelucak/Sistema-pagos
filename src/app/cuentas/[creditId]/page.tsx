import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { calculateCreditTracking } from "@/lib/credit-calculations";
import RegistrarCobroButton from "@/components/RegistrarCobroButton";
import CreditStatusButton from "@/components/CreditStatusButton";
import EditPaymentButton from "@/components/EditPaymentButton";
import DeletePaymentButton from "@/components/DeletePaymentButton";
import BackButton from "@/components/BackButton";

export default async function CuentaPage({
  params,
}: {
  params: Promise<{ creditId: string }>;
}) {
  const user = await requireUser();

  const { creditId } = await params;
  const id = Number(creditId);

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

  const progreso =
    credito.total > 0 ? (credito.montoPagado / credito.total) * 100 : 0;

  const progresoSeguro = Math.min(Math.max(progreso, 0), 100);
  const isAdmin = user.rol === "ADMIN";

  const paymentCuotaMap = new Map<number, number>();

  let acumulado = 0;

  const pagosOrdenCronologico = [...credito.payments].sort(
    (a, b) => a.fechaPago.getTime() - b.fechaPago.getTime(),
  );

  for (const pago of pagosOrdenCronologico) {
    acumulado += pago.monto;

    const cuotaNumero =
      credito.valorCuota > 0 ? Math.ceil(acumulado / credito.valorCuota) : 1;

    paymentCuotaMap.set(
      pago.id,
      Math.min(Math.max(cuotaNumero, 1), credito.cantidadCuotas),
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div>
          <BackButton />

          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">
              {credito.client.nombre}
            </h1>

            <StatusBadge dias={tracking.diasParaVencer} />
          </div>

          <p className="text-slate-600">Detalle de cuenta</p>
        </div>

        {!credito.activo && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            Esta cuenta está dada de baja. No aparecerá en los listados
            operativos.
          </div>
        )}

        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Próxima acción</p>

          <div className="mt-2 space-y-1">
            {tracking.diasParaVencer < 0 ? (
              <p className="text-red-600 font-semibold">
                Cuenta vencida hace {Math.abs(tracking.diasParaVencer)} día
                {Math.abs(tracking.diasParaVencer) === 1 ? "" : "s"}. Saldo
                pendiente: ${tracking.saldo.toLocaleString("es-AR")}
              </p>
            ) : tracking.diasParaVencer === 0 ? (
              <p className="text-amber-600 font-semibold">
                Vence hoy. Cobrar ${credito.valorCuota.toLocaleString("es-AR")}
              </p>
            ) : (
              <p className="text-slate-700 font-semibold">
                Próximo cobro en {tracking.diasParaVencer} día
                {tracking.diasParaVencer === 1 ? "" : "s"} (
                {tracking.proximoVencimiento.toLocaleDateString("es-AR")})
              </p>
            )}

            {/* NUEVO BLOQUE */}
            {!tracking.cuotaActualCompleta && (
              <p className="text-sm text-red-600 font-medium">
                ⚠ Cuota incompleta: faltan $
                {(credito.valorCuota - tracking.restoPendiente).toLocaleString(
                  "es-AR",
                )}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card title="Total" value={credito.total} />
          <Card title="Pagado" value={credito.montoPagado} />
          <Card title="Saldo" value={tracking.saldo} highlight />
          <Card title="Cuota" value={credito.valorCuota} />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">
            Progreso del crédito
          </p>

          <div className="mt-4">
            <div className="flex justify-between text-sm text-slate-700">
              <span>
                {tracking.cuotasPagadas} / {credito.cantidadCuotas} cuotas
              </span>
              <span>{Math.round(progresoSeguro)}%</span>
            </div>

            <div className="mt-2 h-2 w-full rounded bg-slate-200">
              <div
                className="h-2 rounded bg-slate-900"
                style={{ width: `${progresoSeguro}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-950">
            Datos de la cuenta
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
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
            <Info label="Estado" value={tracking.estado} />
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

        {isAdmin && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <RegistrarCobroButton
              creditId={credito.id}
              saldo={tracking.saldo}
            />
            <CreditStatusButton creditId={credito.id} activo={credito.activo} />
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
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

          <div className="mt-6 space-y-4">
            {credito.payments.map((pago) => (
              <div key={pago.id} className="relative pl-6">
                <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-slate-900" />
                <div className="absolute -bottom-4 left-1.25 top-5 w-px bg-slate-200" />

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">
                        Cobro registrado · Cuota {paymentCuotaMap.get(pago.id)}/
                        {credito.cantidadCuotas}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {pago.fechaPago.toLocaleDateString("es-AR")}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-sm text-slate-500">Monto</p>
                      <p className="text-lg font-bold text-slate-950">
                        ${pago.monto.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-4 flex gap-3 border-t border-slate-200 pt-3">
                      <EditPaymentButton
                        paymentId={pago.id}
                        currentAmount={pago.monto}
                      />
                      <DeletePaymentButton paymentId={pago.id} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {credito.payments.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
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

function StateMessage({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 text-slate-900 shadow-sm">
        {title}
      </div>
    </main>
  );
}

function StatusBadge({ dias }: { dias: number }) {
  if (dias < 0) {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
        VENCIDO
      </span>
    );
  }

  if (dias === 0) {
    return (
      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
        VENCE HOY
      </span>
    );
  }

  return (
    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
      AL DÍA
    </span>
  );
}
