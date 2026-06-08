import Link from "next/link";
import { redirect } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NuevoProductoPage() {
  try {
    await requireAdmin();
  } catch {
    redirect("/login");
  }

  const [categories, brandsRaw] = await Promise.all([
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
            Nuevo producto
          </h1>

          <p className="mt-2 text-slate-600">
            Cargá un producto manualmente. El código interno se generará
            automáticamente según la categoría.
          </p>
        </div>

        <ProductForm
          categories={categories}
          mode="create"
          brandSuggestions={brandSuggestions}
        />
      </section>
    </main>
  );
}
