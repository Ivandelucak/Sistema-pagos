//src/lib/late-payment-alerts.ts

import {
  addDaysToDateOnly,
  getBusinessTodayDateOnly,
  normalizeStoredDateToDateOnly,
} from "@/lib/credit-calculations";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type LatePaymentAlertAccount = {
  creditId: number;
  clientName: string;
  creditType: string;
  sellerId: number;
  sellerName: string;
  nextDueDate: Date;
  diasParaVencer: number;
  saldo: number;
  valorCuota: number;
  frecuenciaDias: number;
  cuotasPagadas: number;
  cuotasQueDeberianEstarPagas: number;
  cuotasImpagasVencidas: number;
  threshold: number;
};

type CreditForLatePaymentAlert = {
  id: number;
  fechaInicio: Date;
  frecuenciaDias: number;
  cantidadCuotas: number;
  valorCuota: number;
  total: number;
  montoPagado: number;
  saldo: number;
  activo: boolean;
  tipo: string;
  vendedorId: number;
  client: {
    nombre: string;
  };
  vendedor: {
    id: number;
    nombre: string;
  };
};

function getLatePaymentThreshold(frecuenciaDias: number) {
  if (frecuenciaDias <= 1) return 7;
  if (frecuenciaDias <= 7) return 3;

  return 2;
}

function getFrequencyLabel(frecuenciaDias: number) {
  if (frecuenciaDias <= 1) return "diaria";
  if (frecuenciaDias <= 7) return "semanal";
  if (frecuenciaDias <= 15) return "quincenal";
  if (frecuenciaDias <= 31) return "mensual";

  return `cada ${frecuenciaDias} días`;
}

export function getLatePaymentFrequencyLabel(frecuenciaDias: number) {
  return getFrequencyLabel(frecuenciaDias);
}

export function calculateLatePaymentAlert(
  credit: CreditForLatePaymentAlert,
  now = new Date(),
): LatePaymentAlertAccount | null {
  if (!credit.activo || credit.saldo <= 0) return null;

  if (
    !Number.isInteger(credit.frecuenciaDias) ||
    credit.frecuenciaDias <= 0 ||
    !Number.isFinite(credit.valorCuota) ||
    credit.valorCuota <= 0
  ) {
    return null;
  }

  const hoy = getBusinessTodayDateOnly(now);
  const fechaInicio = normalizeStoredDateToDateOnly(credit.fechaInicio);

  const diffDays = Math.floor(
    (hoy.getTime() - fechaInicio.getTime()) / MS_PER_DAY,
  );

  if (diffDays < 0) return null;

  const cuotasPagadas = Math.floor(credit.montoPagado / credit.valorCuota);

  const cuotasQueDeberianEstarPagas = Math.min(
    Math.floor(diffDays / credit.frecuenciaDias) + 1,
    credit.cantidadCuotas,
  );

  const cuotasImpagasVencidas = Math.max(
    cuotasQueDeberianEstarPagas - cuotasPagadas,
    0,
  );

  const threshold = getLatePaymentThreshold(credit.frecuenciaDias);

  if (cuotasImpagasVencidas < threshold) return null;

  const nextDueDate = addDaysToDateOnly(
    fechaInicio,
    cuotasPagadas * credit.frecuenciaDias,
  );

  const diasParaVencer = Math.round(
    (nextDueDate.getTime() - hoy.getTime()) / MS_PER_DAY,
  );

  return {
    creditId: credit.id,
    clientName: credit.client.nombre,
    creditType: credit.tipo,
    sellerId: credit.vendedor.id,
    sellerName: credit.vendedor.nombre,
    nextDueDate,
    diasParaVencer,
    saldo: credit.saldo,
    valorCuota: credit.valorCuota,
    frecuenciaDias: credit.frecuenciaDias,
    cuotasPagadas,
    cuotasQueDeberianEstarPagas,
    cuotasImpagasVencidas,
    threshold,
  };
}

export function getLatePaymentAlerts(
  credits: CreditForLatePaymentAlert[],
  now = new Date(),
) {
  return credits
    .map((credit) => calculateLatePaymentAlert(credit, now))
    .filter((alert): alert is LatePaymentAlertAccount => Boolean(alert))
    .sort((a, b) => {
      if (b.cuotasImpagasVencidas !== a.cuotasImpagasVencidas) {
        return b.cuotasImpagasVencidas - a.cuotasImpagasVencidas;
      }

      if (a.diasParaVencer !== b.diasParaVencer) {
        return a.diasParaVencer - b.diasParaVencer;
      }

      return a.clientName.localeCompare(b.clientName, "es", {
        sensitivity: "base",
      });
    });
}
