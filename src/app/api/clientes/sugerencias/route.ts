//src/app/api/clientes/sugerencias/route.ts

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

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") ?? "").trim();

    if (q.length < 3) {
      return NextResponse.json({ clientes: [] });
    }

    const normalizedQuery = normalizeText(q);

    const clientes = await prisma.client.findMany({
      where: {
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        direccion: true,
        vendedor: {
          select: {
            nombre: true,
          },
        },
        credits: {
          select: {
            id: true,
            activo: true,
            saldo: true,
          },
        },
      },
      orderBy: {
        nombre: "asc",
      },
      take: 1500,
    });

    const filtered = clientes
      .filter((cliente) => {
        const fields = [
          cliente.nombre,
          cliente.telefono ?? "",
          cliente.direccion ?? "",
          cliente.vendedor.nombre,
        ];

        return fields.some((field) =>
          normalizeText(field).includes(normalizedQuery),
        );
      })
      .sort((a, b) => {
        const aName = normalizeText(a.nombre);
        const bName = normalizeText(b.nombre);

        const aExact = aName === normalizedQuery ? 0 : 1;
        const bExact = bName === normalizedQuery ? 0 : 1;

        if (aExact !== bExact) return aExact - bExact;

        const aStarts = aName.startsWith(normalizedQuery) ? 0 : 1;
        const bStarts = bName.startsWith(normalizedQuery) ? 0 : 1;

        if (aStarts !== bStarts) return aStarts - bStarts;

        return aName.localeCompare(bName);
      })
      .slice(0, 8);

    return NextResponse.json({
      clientes: filtered.map((cliente) => ({
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        vendedorNombre: cliente.vendedor.nombre,
        cuentasActivas: cliente.credits.filter(
          (cuenta) => cuenta.activo && cuenta.saldo > 0,
        ).length,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al buscar clientes";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
