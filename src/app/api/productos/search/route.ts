//src/app/api/productos/search/route.ts

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, "");
}

export async function GET(req: Request) {
  try {
    await requireUser();

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") ?? "").trim();

    if (q.length < 2) {
      return NextResponse.json({ products: [] });
    }

    const normalizedQuery = normalizeText(q);
    const normalizedQueryCode = normalizeCode(q);

    const products = await prisma.stockProduct.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        brand: true,
        cashPrice: true,
        financedPrice: true,
        stock: true,
        lowStockAlert: true,
        imageUrl: true,
        category: {
          select: {
            codePrefix: true,
            name: true,
          },
        },
      },
      orderBy: {
        code: "asc",
      },
      take: 2000,
    });

    const filtered = products
      .filter((product) => {
        const productCode = normalizeCode(product.code);

        const codeMatches =
          normalizedQueryCode.length > 0 &&
          productCode.includes(normalizedQueryCode);

        const fields = [
          product.code,
          product.name,
          product.brand ?? "",
          product.category.name,
          product.category.codePrefix,
        ];

        const textMatches = fields.some((field) =>
          normalizeText(field).includes(normalizedQuery),
        );

        return codeMatches || textMatches;
      })
      .sort((a, b) => {
        const aCode = normalizeCode(a.code);
        const bCode = normalizeCode(b.code);

        const aExactCode =
          normalizedQueryCode && aCode === normalizedQueryCode ? 0 : 1;
        const bExactCode =
          normalizedQueryCode && bCode === normalizedQueryCode ? 0 : 1;

        if (aExactCode !== bExactCode) return aExactCode - bExactCode;

        const aStartsCode =
          normalizedQueryCode && aCode.startsWith(normalizedQueryCode) ? 0 : 1;
        const bStartsCode =
          normalizedQueryCode && bCode.startsWith(normalizedQueryCode) ? 0 : 1;

        if (aStartsCode !== bStartsCode) return aStartsCode - bStartsCode;

        const aName = normalizeText(a.name);
        const bName = normalizeText(b.name);

        const aStartsName = aName.startsWith(normalizedQuery) ? 0 : 1;
        const bStartsName = bName.startsWith(normalizedQuery) ? 0 : 1;

        if (aStartsName !== bStartsName) return aStartsName - bStartsName;

        return a.code.localeCompare(b.code);
      })
      .slice(0, 10);

    return NextResponse.json({
      products: filtered.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        brand: product.brand,
        cashPrice: product.cashPrice,
        financedPrice: product.financedPrice,
        stock: product.stock,
        lowStockAlert: product.lowStockAlert,
        imageUrl: product.imageUrl,
        categoryName: product.category.name,
        categoryCodePrefix: product.category.codePrefix,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al buscar productos";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
