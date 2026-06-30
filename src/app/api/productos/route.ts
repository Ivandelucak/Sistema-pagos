//src/app/api/productos/route.ts
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

async function generateProductCode(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  categoryId: number,
  codePrefix: string,
) {
  const products = await tx.stockProduct.findMany({
    where: {
      categoryId,
    },
    select: {
      code: true,
    },
  });

  const maxNumber = products.reduce((max, product) => {
    const [, rawNumber] = product.code.split("-");
    const parsed = Number(rawNumber);

    if (!Number.isInteger(parsed)) return max;

    return Math.max(max, parsed);
  }, 0);

  return `${codePrefix}-${String(maxNumber + 1).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();

    const body = await req.json();

    const categoryId = Number(body.categoryId);
    const name = String(body.name ?? "").trim();
    const brand = String(body.brand ?? "").trim();
    const cost = Number(body.cost);
    const cashPrice = Number(body.cashPrice);
    const financedPrice = Number(body.financedPrice);
    const stock = Number(body.stock);
    const lowStockAlert = Number(body.lowStockAlert);
    const imageUrl = String(body.imageUrl ?? "").trim();

    if (!Number.isInteger(categoryId)) {
      return NextResponse.json(
        { error: "Categoría inválida" },
        { status: 400 },
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(cost) || cost < 0) {
      return NextResponse.json({ error: "Costo inválido" }, { status: 400 });
    }

    if (!Number.isFinite(cashPrice) || cashPrice <= 0) {
      return NextResponse.json(
        { error: "Precio contado inválido" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(financedPrice) || financedPrice <= 0) {
      return NextResponse.json(
        { error: "Precio financiado inválido" },
        { status: 400 },
      );
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return NextResponse.json({ error: "Stock inválido" }, { status: 400 });
    }

    if (!Number.isInteger(lowStockAlert) || lowStockAlert < 0) {
      return NextResponse.json(
        { error: "Alerta de stock inválida" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const category = await tx.productCategory.findFirst({
        where: {
          id: categoryId,
          active: true,
        },
        select: {
          id: true,
          codePrefix: true,
        },
      });

      if (!category) {
        throw new Error("La categoría seleccionada no existe o está inactiva");
      }

      const code = await generateProductCode(
        tx,
        category.id,
        category.codePrefix,
      );

      const product = await tx.stockProduct.create({
        data: {
          code,
          name,
          slug: makeSlug(name),
          categoryId,
          brand: brand || null,
          cost,
          cashPrice,
          financedPrice,
          stock,
          lowStockAlert,
          imageUrl: imageUrl || null,
          active: true,
        },
      });

      if (stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: "INITIAL",
            quantity: stock,
            previousStock: 0,
            newStock: stock,
            userId: user.id,
            note: "Stock inicial al crear producto",
          },
        });
      }

      return product;
    });

    return NextResponse.json({ ok: true, productId: result.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al crear producto";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
