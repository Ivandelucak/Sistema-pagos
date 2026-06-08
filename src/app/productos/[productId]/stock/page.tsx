import Link from "next/link";
import StockAdjustForm from "@/components/StockAdjustForm";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AjustarStockPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  await requireAdmin();

  const { productId } = await params;
  const id = Number(productId);

  if (!Number.isInteger(id)) {
    return <div className="p-8">Producto inválido</div>;
  }

  const product = await prisma.stockProduct.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      stock: true,
    },
  });

  if (!product) {
    return <div className="p-8">Producto no encontrado</div>;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/productos"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            ← Volver a productos
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
            Ajustar stock
          </h1>

          <p className="mt-2 text-slate-600">
            Producto:{" "}
            <span className="font-semibold text-slate-950">
              {product.code} · {product.name}
            </span>
          </p>
        </div>

        <StockAdjustForm
          productId={product.id}
          productName={product.name}
          currentStock={product.stock}
        />
      </section>
    </main>
  );
}
