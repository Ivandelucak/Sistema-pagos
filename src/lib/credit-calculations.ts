export type CreditStatus = "VENCIDO" | "VIGENTE" | "PAGADO";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

function getDatePartsInArgentina(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

export function getBusinessTodayDateOnly(now = new Date()) {
  const { year, month, day } = getDatePartsInArgentina(now);

  return new Date(Date.UTC(year, month - 1, day));
}

export function parseDateInputAsDateOnly(value: unknown) {
  if (typeof value !== "string") return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(Date.UTC(year, month - 1, day));
}

export function normalizeStoredDateToDateOnly(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function addDaysToDateOnly(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);

  return result;
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

  const fechaBase = normalizeStoredDateToDateOnly(fechaInicio);

  const proximoVencimiento = addDaysToDateOnly(
    fechaBase,
    cuotasPagadas * frecuenciaDias,
  );

  const hoy = getBusinessTodayDateOnly();
  const vencimiento = normalizeStoredDateToDateOnly(proximoVencimiento);

  const diasParaVencer = Math.round(
    (vencimiento.getTime() - hoy.getTime()) / MS_PER_DAY,
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
