import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const clientId = Number(id);

    if (!Number.isInteger(clientId)) {
      return NextResponse.json({ error: "Cliente inválido" }, { status: 400 });
    }

    const body = await req.json();

    const nombre = String(body.nombre ?? "").trim();
    const telefono = String(body.telefono ?? "").trim();
    const direccion = String(body.direccion ?? "").trim();

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 },
      );
    }

    const clienteActual = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        activo: true,
      },
    });

    if (!clienteActual) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 },
      );
    }

    const clientes = await prisma.client.findMany({
      where: {
        activo: true,
        NOT: {
          id: clientId,
        },
      },
      select: {
        id: true,
        nombre: true,
      },
    });

    const normalizedNombre = normalizeText(nombre);

    const duplicate = clientes.find(
      (cliente) => normalizeText(cliente.nombre) === normalizedNombre,
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "Ya existe otro cliente activo con ese nombre." },
        { status: 409 },
      );
    }

    const cliente = await prisma.client.update({
      where: { id: clientId },
      data: {
        nombre,
        telefono: telefono || null,
        direccion: direccion || null,
      },
    });

    return NextResponse.json({ ok: true, cliente });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al editar cliente";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
