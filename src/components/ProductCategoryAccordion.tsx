"use client";

import { useState } from "react";
import StockAdjustButton from "@/components/StockAdjustButton";
import ProductActionsMenu from "@/components/ProductActionsMenu";

type Product = {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  cost: number;
  cashPrice: number;
  financedPrice: number;
  stock: number;
  lowStockAlert: number;
  imageUrl: string | null;
};

type Category = {
  id: number;
  codePrefix: string;
  name: string;
  products: Product[];
};

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
}

function getStockStatus(product: { stock: number; lowStockAlert: number }) {
  if (product.stock <= 0) {
    return {
      label: "SIN STOCK",
      className: "bg-red-100 text-red-700 ring-red-200",
    };
  }

  if (product.stock <= product.lowStockAlert) {
    return {
      label: "STOCK BAJO",
      className: "bg-amber-100 text-amber-700 ring-amber-200",
    };
  }

  return {
    label: "EN STOCK",
    className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  };
}

export default function ProductCategoryAccordion({
  category,
  isAdmin,
  initialOpen,
}: {
  category: Category;
  isAdmin: boolean;
  initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer flex-col gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4 text-left transition-all duration-150 hover:bg-slate-100 active:bg-slate-200 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-950">
            {category.codePrefix} - {category.name}
          </h2>

          <p className="text-sm text-slate-500">
            {category.products.length} producto
            {category.products.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            {open ? "Ocultar productos" : "Ver productos"}
          </span>

          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-slate-700 ring-1 ring-slate-200 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            ↓
          </span>
        </div>
      </button>

      {open && (
        <div className="divide-y divide-slate-100">
          {category.products.map((product) => {
            const stockStatus = getStockStatus(product);

            const rowClass =
              product.stock <= 0
                ? "border-l-4 border-l-red-500 bg-red-50/80 hover:bg-red-50"
                : product.stock <= product.lowStockAlert
                  ? "border-l-4 border-l-amber-500 bg-amber-50/80 hover:bg-amber-50"
                  : "border-l-4 border-l-emerald-500 bg-white hover:bg-slate-50";

            return (
              <div
                key={product.id}
                className={`grid gap-4 px-5 py-4 transition-colors md:grid-cols-[72px_1.2fr_0.7fr_0.7fr_0.7fr_0.55fr_0.8fr] md:items-center ${rowClass}`}
              >
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                      Sin img
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500">
                    {product.code}
                  </p>

                  <p className="mt-1 font-semibold text-slate-950">
                    {product.name}
                  </p>

                  {product.brand && (
                    <p className="text-sm text-slate-500">
                      Marca: {product.brand}
                    </p>
                  )}
                </div>

                {isAdmin && <PriceInfo label="Costo" value={product.cost} />}

                <PriceInfo label="Contado" value={product.cashPrice} />

                <PriceInfo label="Financiado" value={product.financedPrice} />

                <div>
                  <p className="text-xs font-medium text-slate-500">Stock</p>

                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {product.stock}
                  </p>

                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${stockStatus.className}`}
                  >
                    {stockStatus.label}
                  </span>
                </div>

                <div className="flex flex-col gap-2 md:items-end">
                  {isAdmin ? (
                    <div className="flex items-center gap-2">
                      <StockAdjustButton
                        productId={product.id}
                        productName={`${product.code} · ${product.name}`}
                        currentStock={product.stock}
                        currentLowStockAlert={product.lowStockAlert}
                      />

                      <ProductActionsMenu
                        productId={product.id}
                        productName={`${product.code} · ${product.name}`}
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">Consulta</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
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
