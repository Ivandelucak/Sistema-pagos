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
      client: {
        include: {
          vendedor: true,
        },
      },
      vendedor: true,
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

  if (user.rol === "VENDEDOR" && credito.vendedorId !== user.id) {
    return <StateMessage title="No tenés permiso para ver esta cuenta" />;
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
  const cuentaPagada = tracking.saldo <= 0;
  const cuentaVencida = tracking.diasParaVencer < 0 && !cuentaPagada;
  const venceHoy = tracking.diasParaVencer === 0 && !cuentaPagada;

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

  const movimientosOrdenados = [...credito.payments].sort((a, b) => {
    const cuotaA = paymentCuotaMap.get(a.id) ?? 1;
    const cuotaB = paymentCuotaMap.get(b.id) ?? 1;

    if (cuotaA !== cuotaB) {
      return cuotaB - cuotaA;
    }

    const fechaDiff = b.fechaPago.getTime() - a.fechaPago.getTime();

    if (fechaDiff !== 0) {
      return fechaDiff;
    }

    return b.id - a.id;
  });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <BackButton />

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-950">
                  {credito.client.nombre}
                </h1>

                <StatusBadge
                  saldo={tracking.saldo}
                  dias={tracking.diasParaVencer}
                  activo={credito.activo}
                />
              </div>

              <p className="mt-2 text-slate-600">Detalle de cuenta</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge label={`Cuenta #${credito.id}`} />
                <Badge label={`Vendedor: ${credito.vendedor.nombre}`} />
                <Badge label={`Tipo: ${credito.tipo}`} />
              </div>
            </div>

            <Link
              href={`/clientes/${credito.client.id}`}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm active:scale-[0.98]"
            >
              Ver ficha del cliente
            </Link>
          </div>
        </div>

        {!credito.activo && (
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-medium text-slate-700">
            Esta cuenta está dada de baja. No aparecerá en los listados
            operativos. Su historial permanece conservado.
          </div>
        )}

        <div
          className={`rounded-2xl border bg-white p-5 shadow-sm ring-1 ${
            cuentaVencida
              ? "border-red-200 ring-red-100"
              : "border-slate-200 ring-slate-200"
          }`}
        >
          <p className="text-sm font-medium text-slate-500">Próxima acción</p>

          <div className="mt-2 space-y-1">
            {cuentaPagada ? (
              <p className="font-semibold text-slate-800">
                Cuenta pagada. No quedan cobros pendientes.
              </p>
            ) : cuentaVencida ? (
              <p className="font-semibold text-red-600">
                Cuenta vencida hace {Math.abs(tracking.diasParaVencer)} día
                {Math.abs(tracking.diasParaVencer) === 1 ? "" : "s"}. Saldo
                pendiente: ${tracking.saldo.toLocaleString("es-AR")}
              </p>
            ) : venceHoy ? (
              <p className="font-semibold text-slate-800">
                Vence hoy. Cobrar ${credito.valorCuota.toLocaleString("es-AR")}
              </p>
            ) : (
              <p className="font-semibold text-slate-700">
                Próximo cobro en {tracking.diasParaVencer} día
                {tracking.diasParaVencer === 1 ? "" : "s"} (
                {tracking.proximoVencimiento.toLocaleDateString("es-AR")})
              </p>
            )}

            {tracking.saldo > 0 && !tracking.cuotaActualCompleta && (
              <p className="text-sm font-medium text-red-600">
                ⚠ Cuota incompleta: faltan $
                {(credito.valorCuota - tracking.restoPendiente).toLocaleString(
                  "es-AR",
                )}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="Total" value={formatMoney(credito.total)} />
          <MetricCard title="Pagado" value={formatMoney(credito.montoPagado)} />
          <MetricCard
            title="Saldo"
            value={formatMoney(tracking.saldo)}
            highlight={tracking.saldo > 0}
          />
          <MetricCard
            title="Valor cuota"
            value={formatMoney(credito.valorCuota)}
          />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Progreso del crédito
              </h2>
              <p className="text-sm text-slate-500">
                Avance calculado según el total de la cuenta y los cobros
                registrados.
              </p>
            </div>

            <span className="text-sm font-semibold text-slate-700">
              {Math.round(progresoSeguro)}%
            </span>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-sm text-slate-700">
              <span>
                {tracking.cuotasPagadas} / {credito.cantidadCuotas} cuotas
                completas
              </span>
              <span>
                Restan {tracking.cuotasRestantes} cuota
                {tracking.cuotasRestantes === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-3 rounded-full bg-slate-900 transition-all"
                style={{ width: `${progresoSeguro}%` }}
              />
            </div>
          </div>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-950">
            Datos completos de la cuenta
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Información equivalente a los datos operativos del Excel, calculada
            y actualizada desde el sistema.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Info label="Cliente" value={credito.client.nombre} />
            <Info label="Vendedor" value={credito.vendedor.nombre} />
            <Info label="Tipo" value={credito.tipo} />

            <Info
              label="Fecha inicial"
              value={credito.fechaInicio.toLocaleDateString("es-AR")}
            />
            <Info
              label="Próximo vencimiento"
              value={tracking.proximoVencimiento.toLocaleDateString("es-AR")}
            />
            <Info label="Frecuencia" value={`${credito.frecuenciaDias} días`} />

            <Info
              label="Cantidad de cuotas"
              value={String(credito.cantidadCuotas)}
            />
            <Info
              label="Cuotas pagadas"
              value={String(tracking.cuotasPagadas)}
            />
            <Info
              label="Cuotas restantes"
              value={String(tracking.cuotasRestantes)}
            />

            <Info label="Total" value={formatMoney(credito.total)} />
            <Info
              label="Monto pagado"
              value={formatMoney(credito.montoPagado)}
            />
            <Info label="Saldo" value={formatMoney(tracking.saldo)} />

            <Info label="Valor cuota" value={formatMoney(credito.valorCuota)} />
            <Info
              label="DPV / Días para vencer"
              value={String(tracking.diasParaVencer)}
              danger={tracking.diasParaVencer < 0 && tracking.saldo > 0}
            />
            <Info label="Estado" value={tracking.estado} />

            <Info
              label="Estado operativo"
              value={credito.activo ? "Activa" : "Dada de baja"}
            />
            <Info
              label="Fecha de alta"
              value={credito.createdAt.toLocaleDateString("es-AR")}
            />
            <Info
              label="Fecha de carga"
              value={credito.createdAt.toLocaleDateString("es-AR")}
            />
          </div>
        </section>

        {isAdmin && (
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Acciones administrativas
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Registrá cobros o modificá el estado operativo de esta cuenta.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {credito.activo && !cuentaPagada && (
                  <RegistrarCobroButton
                    creditId={credito.id}
                    saldo={tracking.saldo}
                    valorCuota={credito.valorCuota}
                  />
                )}

                <CreditStatusButton
                  creditId={credito.id}
                  activo={credito.activo}
                />
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            {movimientosOrdenados.map((pago, index) => {
              const cuotaNumero = paymentCuotaMap.get(pago.id) ?? 1;
              const isLast = index === movimientosOrdenados.length - 1;

              return (
                <div key={pago.id} className="relative pl-6">
                  <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-slate-900" />

                  {!isLast && (
                    <div className="absolute -bottom-4 left-1.5 top-5 w-px bg-slate-200" />
                  )}

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-950">
                          Cobro registrado · Cuota {cuotaNumero}/
                          {credito.cantidadCuotas}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {pago.fechaPago.toLocaleDateString("es-AR")}
                        </p>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-sm text-slate-500">Monto</p>
                        <p className="text-lg font-bold text-slate-950">
                          {formatMoney(pago.monto)}
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
              );
            })}

            {credito.payments.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Sin movimientos registrados.
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}

function MetricCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string;
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
        {value}
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
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
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

function StatusBadge({
  saldo,
  dias,
  activo,
}: {
  saldo: number;
  dias: number;
  activo: boolean;
}) {
  if (!activo) {
    return (
      <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
        DADA DE BAJA
      </span>
    );
  }

  if (saldo <= 0) {
    return (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
        PAGADA
      </span>
    );
  }

  if (dias < 0) {
    return (
      <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
        VENCIDA
      </span>
    );
  }

  if (dias === 0) {
    return (
      <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
        VENCE HOY
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
      AL DÍA
    </span>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
      {label}
    </span>
  );
}

function StateMessage({ title }: { title: string }) {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 text-slate-900 shadow-sm ring-1 ring-slate-200">
        {title}
      </div>
    </main>
  );
}
