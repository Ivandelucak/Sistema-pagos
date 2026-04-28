import { prisma } from "./prisma";
import { calculateCreditTracking } from "./credit-calculations";

export async function registerPayment({
  creditId,
  monto,
  userId,
}: {
  creditId: number;
  monto: number;
  userId: number;
}) {
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }

  return prisma.$transaction(async (tx) => {
    const credit = await tx.credit.findUnique({
      where: { id: creditId },
    });

    if (!credit) {
      throw new Error("Crédito no encontrado");
    }

    if (credit.saldo <= 0) {
      throw new Error("La cuenta ya está pagada");
    }

    const nuevoMontoPagado = credit.montoPagado + monto;

    const tracking = calculateCreditTracking({
      fechaInicio: credit.fechaInicio,
      frecuenciaDias: credit.frecuenciaDias,
      valorCuota: credit.valorCuota,
      total: credit.total,
      montoPagado: nuevoMontoPagado,
    });

    await tx.payment.create({
      data: {
        creditId,
        monto,
        fechaPago: new Date(),
        registradoPor: userId,
      },
    });

    return tx.credit.update({
      where: { id: creditId },
      data: {
        montoPagado: nuevoMontoPagado,
        saldo: tracking.saldo,
        cuotasPagadas: tracking.cuotasPagadas,
        cuotasRestantes: tracking.cuotasRestantes,
        proximoVencimiento: tracking.proximoVencimiento,
        estado: tracking.estado,
      },
    });
  });
}
