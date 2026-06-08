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

function makeSlug(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidCodePrefix(value: string) {
  return /^\d{3}$/.test(value);
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const codePrefix = String(body.codePrefix ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "El nombre de la categoría es obligatorio" },
        { status: 400 },
      );
    }

    if (!isValidCodePrefix(codePrefix)) {
      return NextResponse.json(
        { error: "El código debe tener exactamente 3 dígitos. Ej: 014" },
        { status: 400 },
      );
    }

    const slug = makeSlug(name);

    if (!slug) {
      return NextResponse.json(
        { error: "El nombre de la categoría no es válido" },
        { status: 400 },
      );
    }

    const existingByCode = await prisma.productCategory.findUnique({
      where: {
        codePrefix,
      },
      select: {
        id: true,
      },
    });

    if (existingByCode) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese código" },
        { status: 409 },
      );
    }

    const existingBySlug = await prisma.productCategory.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (existingBySlug) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese nombre" },
        { status: 409 },
      );
    }

    const lastCategory = await prisma.productCategory.findFirst({
      orderBy: {
        displayOrder: "desc",
      },
      select: {
        displayOrder: true,
      },
    });

    const category = await prisma.productCategory.create({
      data: {
        codePrefix,
        name,
        slug,
        displayOrder: (lastCategory?.displayOrder ?? 0) + 1,
        active: true,
      },
    });

    return NextResponse.json({
      ok: true,
      category,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear categoría";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
