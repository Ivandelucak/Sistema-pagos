import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateCreditTracking } from "@/lib/credit-calculations";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();

    const clientId = Number(body.clientId);
    const vendedorId = Number(body.vendedorId);
    const tipo = String(body.tipo ?? "").trim();
    const fechaInicio = new Date(body.fechaInicio);
    const frecuenciaDias = Number(body.frecuenciaDias);
    const total = Number(body.total);
    const cantidadCuotas = Number(body.cantidadCuotas);

    if (
      !Number.isInteger(clientId) ||
      !Number.isInteger(vendedorId) ||
      !tipo ||
      Number.isNaN(fechaInicio.getTime()) ||
      !Number.isInteger(frecuenciaDias) ||
      frecuenciaDias <= 0 ||
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isInteger(cantidadCuotas) ||
      cantidadCuotas <= 0
    ) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
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
      },
    });

    return NextResponse.json({ ok: true, creditId: credit.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear cuenta";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
