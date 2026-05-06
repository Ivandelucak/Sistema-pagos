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
    const clientId = Number(id);

    const body = await req.json();
    const vendedorId = Number(body.vendedorId);

    if (!Number.isInteger(clientId)) {
      return NextResponse.json({ error: "Cliente inválido" }, { status: 400 });
    }

    if (!Number.isInteger(vendedorId)) {
      return NextResponse.json({ error: "Vendedor inválido" }, { status: 400 });
    }

    const cliente = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        vendedorId: true,
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
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

    if (cliente.vendedorId === vendedorId) {
      return NextResponse.json(
        { error: "El cliente ya tiene ese vendedor principal" },
        { status: 400 },
      );
    }

    await prisma.client.update({
      where: { id: clientId },
      data: { vendedorId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al transferir cliente";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
