import { prisma } from "./prisma";
import { calculateCreditTracking } from "./credit-calculations";

export async function recalculateCredit(creditId: number) {
  const credit = await prisma.credit.findUnique({
    where: { id: creditId },
    include: {
      payments: true,
    },
  });

  if (!credit) throw new Error("Crédito no encontrado");

  const totalPagado = credit.payments.reduce((acc, p) => acc + p.monto, 0);

  const tracking = calculateCreditTracking({
    fechaInicio: credit.fechaInicio,
    frecuenciaDias: credit.frecuenciaDias,
    valorCuota: credit.valorCuota,
    total: credit.total,
    montoPagado: totalPagado,
  });

  return prisma.credit.update({
    where: { id: creditId },
    data: {
      montoPagado: totalPagado,
      saldo: tracking.saldo,
      cuotasPagadas: tracking.cuotasPagadas,
      cuotasRestantes: tracking.cuotasRestantes,
      proximoVencimiento: tracking.proximoVencimiento,
      estado: tracking.estado,
    },
  });
}
