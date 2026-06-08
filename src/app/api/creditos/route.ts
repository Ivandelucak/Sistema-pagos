//src/app/api/creditos/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  calculateCreditTracking,
  parseDateInputAsDateOnly,
} from "@/lib/credit-calculations";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();

    const clientId = Number(body.clientId);
    const vendedorId = Number(body.vendedorId);
    const tipo = String(body.tipo ?? "").trim();
    const fechaInicio = parseDateInputAsDateOnly(body.fechaInicio);
    const frecuenciaDias = Number(body.frecuenciaDias);
    const total = Number(body.total);
    const cantidadCuotas = Number(body.cantidadCuotas);

    if (
      !Number.isInteger(clientId) ||
      !Number.isInteger(vendedorId) ||
      !tipo ||
      !fechaInicio ||
      !Number.isInteger(frecuenciaDias) ||
      frecuenciaDias <= 0 ||
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isInteger(cantidadCuotas) ||
      cantidadCuotas <= 0
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const cliente = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        activo: true,
      },
    });

    if (!cliente || !cliente.activo) {
      return NextResponse.json(
        { error: "Cliente inválido o dado de baja" },
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
      montoPagado: 0,
    });

    const credit = await prisma.credit.create({
      data: {
        clientId,
        vendedorId,
        tipo,
        fechaInicio,
        frecuenciaDias,
        cantidadCuotas,
        valorCuota,
        total,
        montoPagado: 0,
        saldo: tracking.saldo,
        cuotasPagadas: 0,
        cuotasRestantes: cantidadCuotas,
        proximoVencimiento: tracking.proximoVencimiento,
        estado: tracking.estado,
        activo: true,
      },
    });

    return NextResponse.json({ ok: true, creditId: credit.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear cuenta";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
