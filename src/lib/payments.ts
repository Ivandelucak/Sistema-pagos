import { prisma } from "./prisma";
import { calculateCreditTracking } from "./credit-calculations";

export async function registerPayment({
  creditId,
  monto,
  userId,
  fechaPago,
}: {
  creditId: number;
  monto: number;
  userId: number;
  fechaPago: Date;
}) {
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("El monto debe ser mayor a 0");
  }

  if (Number.isNaN(fechaPago.getTime())) {
    throw new Error("La fecha del pago es inválida");
  }

  return prisma.$transaction(async (tx) => {
    const credit = await tx.credit.findUnique({
      where: { id: creditId },
    });

    if (!credit) {
      throw new Error("Crédito no encontrado");
    }

    if (!credit.activo) {
      throw new Error(
        "No se pueden registrar cobros en una cuenta dada de baja",
      );
    }

    if (credit.saldo <= 0) {
      throw new Error("La cuenta ya está pagada");
    }

    if (monto > credit.saldo) {
      throw new Error("El monto no puede ser mayor al saldo pendiente");
    }

    const nuevoMontoPagado = credit.montoPagado + monto;

    if (nuevoMontoPagado > credit.total) {
      throw new Error("El monto pagado no puede superar el total de la cuenta");
    }

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
        fechaPago,
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
