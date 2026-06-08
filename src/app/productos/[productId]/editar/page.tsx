import Link from "next/link";
import ProductForm from "@/components/ProductForm";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditarProductoPage({
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

  const [product, categories, brandsRaw] = await Promise.all([
    prisma.stockProduct.findUnique({
      where: {
        id,
      },
    }),

    prisma.productCategory.findMany({
      where: {
        active: true,
      },
      select: {
        id: true,
        codePrefix: true,
        name: true,
      },
      orderBy: {
        displayOrder: "asc",
      },
    }),

    prisma.stockProduct.findMany({
      where: {
        brand: {
          not: null,
        },
      },
      select: {
        brand: true,
      },
      orderBy: {
        brand: "asc",
      },
    }),
  ]);

  if (!product) {
    return <div className="p-8">Producto no encontrado</div>;
  }

  const brandSuggestions = Array.from(
    new Set(
      brandsRaw
        .map((item) => item.brand?.trim())
        .filter((brand): brand is string => Boolean(brand)),
    ),
  );

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
            Editar producto
          </h1>

          <p className="mt-2 text-slate-600">
            Código interno:{" "}
            <span className="font-semibold text-slate-950">{product.code}</span>
          </p>
        </div>

        <ProductForm
          categories={categories}
          mode="edit"
          brandSuggestions={brandSuggestions}
          initialData={{
            id: product.id,
            categoryId: product.categoryId,
            name: product.name,
            brand: product.brand ?? "",
            cost: product.cost,
            cashPrice: product.cashPrice,
            financedPrice: product.financedPrice,
            lowStockAlert: product.lowStockAlert,
            imageUrl: product.imageUrl ?? "",
            active: product.active,
          }}
        />
      </section>
    </main>
  );
}
