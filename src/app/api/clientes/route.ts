import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const nombre = String(body.nombre ?? "").trim();
    const telefono = String(body.telefono ?? "").trim();
    const direccion = String(body.direccion ?? "").trim();

    const vendedorId = Number(body.vendedorId);

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(vendedorId)) {
      return NextResponse.json({ error: "Vendedor inválido" }, { status: 400 });
    }

    const cliente = await prisma.client.create({
      data: {
        nombre,
        telefono: telefono || null,
        direccion: direccion || null,
        vendedorId,
      },
    });

    return NextResponse.json({
      ok: true,
      clientId: cliente.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al crear cliente";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
