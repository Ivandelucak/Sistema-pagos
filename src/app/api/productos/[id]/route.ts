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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const productId = Number(id);

    if (!Number.isInteger(productId)) {
      return NextResponse.json({ error: "Producto inválido" }, { status: 400 });
    }

    const body = await req.json();

    const categoryId = Number(body.categoryId);
    const name = String(body.name ?? "").trim();
    const brand = String(body.brand ?? "").trim();
    const cost = Number(body.cost);
    const cashPrice = Number(body.cashPrice);
    const financedPrice = Number(body.financedPrice);
    const lowStockAlert = Number(body.lowStockAlert);
    const imageUrl = String(body.imageUrl ?? "").trim();
    const active = Boolean(body.active);

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

    if (!Number.isInteger(lowStockAlert) || lowStockAlert < 0) {
      return NextResponse.json(
        { error: "Alerta de stock inválida" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const currentProduct = await tx.stockProduct.findUnique({
        where: {
          id: productId,
        },
        select: {
          id: true,
          categoryId: true,
          code: true,
        },
      });

      if (!currentProduct) {
        throw new Error("Producto no encontrado");
      }

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

      const nextCode =
        currentProduct.categoryId === categoryId
          ? currentProduct.code
          : await generateProductCode(tx, categoryId, category.codePrefix);

      return tx.stockProduct.update({
        where: {
          id: productId,
        },
        data: {
          code: nextCode,
          name,
          slug: makeSlug(name),
          categoryId,
          brand: brand || null,
          cost,
          cashPrice,
          financedPrice,
          lowStockAlert,
          imageUrl: imageUrl || null,
          active,
        },
      });
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al editar producto";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const productId = Number(id);

    if (!Number.isInteger(productId)) {
      return NextResponse.json({ error: "Producto inválido" }, { status: 400 });
    }

    const product = await prisma.stockProduct.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        active: true,
        name: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      );
    }

    if (!product.active) {
      return NextResponse.json(
        { error: "El producto ya está dado de baja" },
        { status: 400 },
      );
    }

    await prisma.stockProduct.update({
      where: {
        id: productId,
      },
      data: {
        active: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al eliminar producto";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
