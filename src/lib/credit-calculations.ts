export type CreditStatus = "VENCIDO" | "VIGENTE" | "PAGADO";

function normalizeDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calculateCreditTracking({
  fechaInicio,
  frecuenciaDias,
  valorCuota,
  total,
  montoPagado,
}: {
  fechaInicio: Date;
  frecuenciaDias: number;
  valorCuota: number;
  total: number;
  montoPagado: number;
}) {
  const saldo = Math.max(total - montoPagado, 0);

  const cuotasPagadas =
    valorCuota > 0 ? Math.floor(montoPagado / valorCuota) : 0;

  const cuotasRestantes = valorCuota > 0 ? Math.ceil(saldo / valorCuota) : 0;

  const restoPendiente = valorCuota > 0 ? montoPagado % valorCuota : 0;

  const cuotaActualCompleta = restoPendiente === 0;

  const cuotasCompletas = cuotasPagadas;

  const fechaBase = normalizeDate(fechaInicio);

  const proximoVencimiento = new Date(fechaBase);
  proximoVencimiento.setDate(
    proximoVencimiento.getDate() + cuotasPagadas * frecuenciaDias,
  );

  const hoy = normalizeDate(new Date());
  const vencimiento = normalizeDate(proximoVencimiento);

  const diasParaVencer = Math.round(
    (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
  );

  const estado: CreditStatus =
    saldo <= 0 ? "PAGADO" : diasParaVencer < 0 ? "VENCIDO" : "VIGENTE";

  return {
    saldo,
    cuotasPagadas,
    cuotasRestantes,
    proximoVencimiento,
    diasParaVencer,
    estado,
    cuotasCompletas,
    restoPendiente,
    cuotaActualCompleta,
  };
}
