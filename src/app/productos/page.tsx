//src/app/productos/page.tsx
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductCategoryAccordion from "@/components/ProductCategoryAccordion";
import CreateProductCategoryButton from "@/components/CreateProductCategoryButton";

type StockFilter = "todos" | "con-stock" | "bajo-stock" | "sin-stock";

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  })}`;
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    stock?: StockFilter;
  }>;
}) {
  const user = await requireUser();
  const isAdmin = user.rol === "ADMIN";

  const { q, categoria, stock } = await searchParams;

  const search = q?.trim() ?? "";
  const normalizedSearch = normalizeText(search);

  const stockFilter: StockFilter =
    stock === "con-stock" || stock === "bajo-stock" || stock === "sin-stock"
      ? stock
      : "todos";

  const categories = await prisma.productCategory.findMany({
    where: {
      active: true,
    },
    include: {
      products: {
        where: {
          active: true,
        },
        orderBy: {
          code: "asc",
        },
      },
    },
    orderBy: {
      displayOrder: "asc",
    },
  });

  const usedCodeNumbers = categories
    .map((category) => Number(category.codePrefix))
    .filter((value) => Number.isInteger(value));

  const nextCodePrefix = String(
    usedCodeNumbers.length > 0 ? Math.max(...usedCodeNumbers) + 1 : 1,
  ).padStart(3, "0");

  const filteredCategories = categories
    .map((category) => {
      const filteredProducts = category.products.filter((product) => {
        if (categoria && category.slug !== categoria) return false;

        if (stockFilter === "con-stock" && product.stock <= 0) return false;

        if (
          stockFilter === "bajo-stock" &&
          !(product.stock > 0 && product.stock <= product.lowStockAlert)
        ) {
          return false;
        }

        if (stockFilter === "sin-stock" && product.stock > 0) return false;

        if (!normalizedSearch) return true;

        const fields = [
          product.code,
          product.name,
          product.brand ?? "",
          product.sourceWebCode ?? "",
          category.name,
        ];

        return fields.some((field) =>
          normalizeText(field).includes(normalizedSearch),
        );
      });

      return {
        ...category,
        products: filteredProducts.map((product) => ({
          ...product,
          cost: isAdmin ? product.cost : null,
        })),
      };
    })
    .filter((category) => {
      if (category.products.length > 0) return true;

      return !normalizedSearch && stockFilter === "todos";
    });

  const totalProducts = categories.reduce(
    (acc, category) => acc + category.products.length,
    0,
  );

  const lowStockCount = categories.reduce(
    (acc, category) =>
      acc +
      category.products.filter(
        (product) =>
          product.stock > 0 && product.stock <= product.lowStockAlert,
      ).length,
    0,
  );

  const noStockCount = categories.reduce(
    (acc, category) =>
      acc + category.products.filter((product) => product.stock <= 0).length,
    0,
  );

  const visibleProducts = filteredCategories.reduce(
    (acc, category) => acc + category.products.length,
    0,
  );
  const shouldOpenCategories =
    Boolean(normalizedSearch) || Boolean(categoria) || stockFilter !== "todos";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:p-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Productos
            </h1>

            <p className="mt-2 max-w-3xl text-slate-600">
              Control interno de productos, precios y stock. Los vendedores
              pueden consultar; solo administración puede crear, editar o
              ajustar stock.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Sesión: {user.nombre} · {user.rol}
            </p>
          </div>

          {isAdmin && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/productos/importar"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98]"
              >
                Importar Excel
              </Link>

              <CreateProductCategoryButton nextCodePrefix={nextCodePrefix} />

              <Link
                href="/productos/nuevo"
                className="rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md active:scale-[0.98]"
              >
                Nuevo producto
              </Link>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard title="Productos activos" value={totalProducts} />
          <SummaryCard title="Visibles" value={visibleProducts} />
          <SummaryCard title="Stock bajo" value={lowStockCount} />
          <SummaryCard title="Sin stock" value={noStockCount} />
        </div>

        <form className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto_auto] md:items-end">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Buscar producto
              </label>
              <input
                name="q"
                defaultValue={search}
                placeholder="Buscar por código, nombre o marca..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Categoría
              </label>
              <select
                name="categoria"
                defaultValue={categoria ?? ""}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.codePrefix} - {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Stock
              </label>
              <select
                name="stock"
                defaultValue={stockFilter}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
              >
                <option value="todos">Todos</option>
                <option value="con-stock">Con stock</option>
                <option value="bajo-stock">Stock bajo</option>
                <option value="sin-stock">Sin stock</option>
              </select>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
            >
              Aplicar
            </button>

            <Link
              href="/productos"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Limpiar
            </Link>
          </div>
        </form>

        <div className="space-y-5">
          {filteredCategories.map((category) => (
            <ProductCategoryAccordion
              key={category.id}
              category={category}
              isAdmin={isAdmin}
              initialOpen={shouldOpenCategories}
            />
          ))}

          {filteredCategories.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No se encontraron productos con los filtros aplicados.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function PriceInfo({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{formatMoney(value)}</p>
    </div>
  );
}
