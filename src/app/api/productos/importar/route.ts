//src/app/api/productos/importar/route.ts

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { importStockProductsFromBuffer } from "@/lib/stock-products-importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_MB = 12;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo Excel." },
        { status: 400 },
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { error: "El archivo está vacío." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `El archivo no puede superar ${MAX_FILE_SIZE_MB}MB.` },
        { status: 400 },
      );
    }

    const allowedExtensions = [".xlsx", ".xls"];
    const fileName = file.name.toLowerCase();

    const validExtension = allowedExtensions.some((extension) =>
      fileName.endsWith(extension),
    );

    if (!validExtension) {
      return NextResponse.json(
        { error: "El archivo debe ser .xlsx o .xls." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await importStockProductsFromBuffer({
      db: prisma,
      buffer,
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al importar productos";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
