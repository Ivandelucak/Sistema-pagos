//src/app/api/pagos/route.ts

import { NextResponse } from "next/server";
import { registerPayment, type PaymentMethodValue } from "@/lib/payments";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseInputDate(value: unknown) {
  if (typeof value !== "string") return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function parseMetodoPago(value: unknown): PaymentMethodValue | null {
  const metodo = String(value ?? "")
    .trim()
    .toUpperCase();

  if (metodo === "EFECTIVO" || metodo === "TRANSFERENCIA") {
    return metodo;
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();

    const body = await req.json();

    const creditId = Number(body.creditId);
    const monto = Number(body.monto);
    const fechaPago = parseInputDate(body.fechaPago);
    const metodoPago = parseMetodoPago(body.metodoPago);

    if (!Number.isInteger(creditId)) {
      return NextResponse.json({ error: "Cuenta inválida" }, { status: 400 });
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    if (!fechaPago) {
      return NextResponse.json(
        { error: "Fecha de pago inválida" },
        { status: 400 },
      );
    }

    if (!metodoPago) {
      return NextResponse.json(
        { error: "Método de pago inválido" },
        { status: 400 },
      );
    }

    const credito = await prisma.credit.findUnique({
      where: { id: creditId },
      select: {
        id: true,
        saldo: true,
        activo: true,
      },
    });

    if (!credito) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 },
      );
    }

    if (!credito.activo) {
      return NextResponse.json(
        { error: "No se pueden registrar cobros en una cuenta dada de baja" },
        { status: 400 },
      );
    }

    if (credito.saldo <= 0) {
      return NextResponse.json(
        { error: "La cuenta no tiene saldo pendiente" },
        { status: 400 },
      );
    }

    if (monto > credito.saldo) {
      return NextResponse.json(
        { error: "El monto no puede ser mayor al saldo pendiente" },
        { status: 400 },
      );
    }

    await registerPayment({
      creditId,
      monto,
      userId: user.id,
      fechaPago,
      metodoPago,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al registrar cobro";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
