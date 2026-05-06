import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const creditId = Number(id);

    const body = await req.json();
    const vendedorId = Number(body.vendedorId);

    if (!Number.isInteger(creditId)) {
      return NextResponse.json({ error: "Cuenta inválida" }, { status: 400 });
    }

    if (!Number.isInteger(vendedorId)) {
      return NextResponse.json({ error: "Vendedor inválido" }, { status: 400 });
    }

    const credit = await prisma.credit.findUnique({
      where: { id: creditId },
      select: {
        id: true,
        vendedorId: true,
      },
    });

    if (!credit) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 },
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

    if (credit.vendedorId === vendedorId) {
      return NextResponse.json(
        { error: "La cuenta ya pertenece a ese vendedor" },
        { status: 400 },
      );
    }

    await prisma.credit.update({
      where: { id: creditId },
      data: { vendedorId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al transferir cuenta";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
