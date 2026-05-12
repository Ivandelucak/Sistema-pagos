import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  calculateCreditTracking,
  parseDateInputAsDateOnly,
} from "@/lib/credit-calculations";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const creditId = Number(id);

    if (!Number.isInteger(creditId)) {
      return NextResponse.json({ error: "Cuenta inválida" }, { status: 400 });
    }

    const body = await req.json();

    const existingCredit = await prisma.credit.findUnique({
      where: { id: creditId },
      select: {
        id: true,
        clientId: true,
        montoPagado: true,
      },
    });

    if (!existingCredit) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 },
      );
    }

    const isOnlyStatusUpdate =
      typeof body.activo === "boolean" &&
      body.tipo === undefined &&
      body.fechaInicio === undefined &&
      body.frecuenciaDias === undefined &&
      body.total === undefined &&
      body.cantidadCuotas === undefined &&
      body.vendedorId === undefined;

    if (isOnlyStatusUpdate) {
      const credit = await prisma.credit.update({
        where: { id: creditId },
        data: {
          activo: body.activo,
        },
      });

      return NextResponse.json({ ok: true, credit });
    }

    const tipo = String(body.tipo ?? "").trim();
    const fechaInicio = parseDateInputAsDateOnly(body.fechaInicio);
    const frecuenciaDias = Number(body.frecuenciaDias);
    const total = Number(body.total);
    const cantidadCuotas = Number(body.cantidadCuotas);
    const vendedorId = Number(body.vendedorId);

    if (
      !tipo ||
      !fechaInicio ||
      !Number.isInteger(frecuenciaDias) ||
      frecuenciaDias <= 0 ||
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isInteger(cantidadCuotas) ||
      cantidadCuotas <= 0 ||
      !Number.isInteger(vendedorId)
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    if (total < existingCredit.montoPagado) {
      return NextResponse.json(
        {
          error: "El total no puede ser menor al monto ya pagado de la cuenta.",
        },
        { status: 400 },
      );
    }

    const vendedor = await prisma.user.findFirst({
      where: {
        id: vendedorId,
        rol: "VENDEDOR",
        activo: true,
      },
      select: {
        id: true,
      },
    });

    if (!vendedor) {
      return NextResponse.json(
        { error: "El vendedor seleccionado no existe o no está activo" },
        { status: 400 },
      );
    }

    const valorCuota = total / cantidadCuotas;

    const tracking = calculateCreditTracking({
      fechaInicio,
      frecuenciaDias,
      valorCuota,
      total,
      montoPagado: existingCredit.montoPagado,
    });

    const credit = await prisma.credit.update({
      where: { id: creditId },
      data: {
        vendedorId,
        tipo,
        fechaInicio,
        frecuenciaDias,
        cantidadCuotas,
        valorCuota,
        total,
        saldo: tracking.saldo,
        cuotasPagadas: tracking.cuotasPagadas,
        cuotasRestantes: tracking.cuotasRestantes,
        proximoVencimiento: tracking.proximoVencimiento,
        estado: tracking.estado,
      },
    });

    return NextResponse.json({ ok: true, credit });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al actualizar cuenta";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
