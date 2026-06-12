//src/components/EditCreditProductsButton.tsx

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

type ProductSearchResult = {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  cashPrice: number;
  financedPrice: number;
  stock: number;
  lowStockAlert: number;
  imageUrl: string | null;
  categoryName: string;
  categoryCodePrefix: string;
};

type InitialProduct = {
  id: number;
  productId: number;
  quantity: number;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  product: {
    id: number;
    code: string;
    name: string;
    imageUrl: string | null;
    active: boolean;
    stock: number;
    lowStockAlert: number;
  };
};

type EditableProduct = {
  productId: number;
  code: string;
  name: string;
  imageUrl: string | null;
  active: boolean;
  stock: number;
  lowStockAlert: number;
  oldQuantity: number;
  quantity: number;
};

function preventNumberWheel(e: WheelEvent<HTMLInputElement>) {
  e.currentTarget.blur();
}

function buildSignature(products: EditableProduct[]) {
  return [...products]
    .sort((a, b) => a.productId - b.productId)
    .map((product) => `${product.productId}:${product.quantity}`)
    .join("|");
}

function toEditableProduct(item: InitialProduct): EditableProduct {
  return {
    productId: item.productId,
    code: item.productCodeSnapshot,
    name: item.productNameSnapshot,
    imageUrl: item.product.imageUrl,
    active: item.product.active,
    stock: item.product.stock,
    lowStockAlert: item.product.lowStockAlert,
    oldQuantity: item.quantity,
    quantity: item.quantity,
  };
}

export default function EditCreditProductsButton({
  creditId,
  creditActive,
  initialProducts,
}: {
  creditId: number;
  creditActive: boolean;
  initialProducts: InitialProduct[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  const initialEditableProducts = useMemo(
    () => initialProducts.map(toEditableProduct),
    [initialProducts],
  );

  const initialSignature = useMemo(
    () => buildSignature(initialEditableProducts),
    [initialEditableProducts],
  );

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<EditableProduct[]>(
    initialEditableProducts,
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currentSignature = useMemo(
    () => buildSignature(selectedProducts),
    [selectedProducts],
  );

  const hasChanges = currentSignature !== initialSignature;

  useEffect(() => {
    setSelectedProducts(initialEditableProducts);
  }, [initialEditableProducts]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const value = query.trim();

    if (value.length < 2) {
      setResults([]);
      setSearchOpen(false);
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setSearchLoading(true);

        const params = new URLSearchParams();
        params.set("q", value);

        const res = await fetch(`/api/productos/search?${params.toString()}`, {
          signal: controller.signal,
        });

        const data = await res.json();

        setResults(data.products ?? []);
        setSearchOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  function closeModal() {
    if (loading) return;

    setOpen(false);
    setConfirmOpen(false);
    setError("");
    setQuery("");
    setResults([]);
    setSearchOpen(false);
    setSelectedProducts(initialEditableProducts);
  }

  function getStockAfter(product: EditableProduct) {
    if (!creditActive) return product.stock;

    return product.stock + product.oldQuantity - product.quantity;
  }

  function addProduct(product: ProductSearchResult) {
    setError("");

    setSelectedProducts((current) => {
      const existing = current.find((item) => item.productId === product.id);

      if (existing) {
        const nextQuantity = existing.quantity + 1;
        const stockAfter = creditActive
          ? existing.stock + existing.oldQuantity - nextQuantity
          : existing.stock;

        if (creditActive && stockAfter < 0) {
          setError(
            `No hay stock suficiente para agregar más unidades de ${existing.code}.`,
          );
          return current;
        }

        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: nextQuantity,
              }
            : item,
        );
      }

      if (creditActive && product.stock <= 0) {
        setError("No podés agregar un producto sin stock.");
        return current;
      }

      return [
        ...current,
        {
          productId: product.id,
          code: product.code,
          name: product.name,
          imageUrl: product.imageUrl,
          active: true,
          stock: product.stock,
          lowStockAlert: product.lowStockAlert,
          oldQuantity: 0,
          quantity: 1,
        },
      ];
    });

    setQuery("");
    setResults([]);
    setSearchOpen(false);
  }

  function updateQuantity(productId: number, quantity: number) {
    setError("");

    setSelectedProducts((current) =>
      current.map((product) => {
        if (product.productId !== productId) return product;

        const safeQuantity = Number.isInteger(quantity) ? quantity : 1;
        const nextQuantity = Math.max(safeQuantity, 1);
        const maxQuantity = creditActive
          ? product.stock + product.oldQuantity
          : nextQuantity;

        return {
          ...product,
          quantity: creditActive
            ? Math.min(nextQuantity, maxQuantity)
            : nextQuantity,
        };
      }),
    );
  }

  function removeProduct(productId: number) {
    setError("");
    setSelectedProducts((current) =>
      current.filter((product) => product.productId !== productId),
    );
  }

  function askConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    for (const product of selectedProducts) {
      if (!Number.isInteger(product.quantity) || product.quantity <= 0) {
        setError(`Cantidad inválida para ${product.code} · ${product.name}.`);
        return;
      }

      const stockAfter = getStockAfter(product);

      if (creditActive && stockAfter < 0) {
        setError(
          `Stock insuficiente para ${product.code} · ${product.name}. Stock final: ${stockAfter}.`,
        );
        return;
      }

      if (!product.active && product.quantity > product.oldQuantity) {
        setError(
          `El producto ${product.code} · ${product.name} está dado de baja. Solo podés quitarlo o reducir su cantidad.`,
        );
        return;
      }
    }

    if (!hasChanges) {
      setError("No hay cambios para guardar.");
      return;
    }

    setConfirmOpen(true);
  }

  async function handleSave() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/creditos/${creditId}/productos`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: selectedProducts.map((product) => ({
            productId: product.productId,
            quantity: product.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudieron editar los productos.");
        setConfirmOpen(false);
        setLoading(false);
        return;
      }

      setConfirmOpen(false);
      setOpen(false);
      setLoading(false);

      router.refresh();
    } catch {
      setError("Ocurrió un error al editar los productos.");
      setConfirmOpen(false);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedProducts(initialEditableProducts);
          setError("");
          setOpen(true);
        }}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 hover:shadow-md active:scale-[0.98]"
      >
        Editar productos
      </button>

      {open && !confirmOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden bg-slate-950/60 px-4 py-4 backdrop-blur-sm sm:py-6">
          <div className="flex h-full min-h-0 items-center justify-center">
            <div className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
              <div className="shrink-0 border-b border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-950">
                  Editar productos asociados
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Podés cambiar cantidades, quitar productos o agregar nuevos.
                  {creditActive
                    ? " El stock se ajustará automáticamente al guardar."
                    : " Como la cuenta está dada de baja, el stock no se modifica hasta reactivarla."}
                </p>
              </div>

              <form
                onSubmit={askConfirm}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
                  <div ref={searchRef} className="relative">
                    <label className="text-sm font-medium text-slate-700">
                      Agregar producto
                    </label>

                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setError("");
                      }}
                      onFocus={() => {
                        if (query.trim().length >= 2) {
                          setSearchOpen(true);
                        }
                      }}
                      placeholder="Buscar por código o nombre..."
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
                    />

                    {searchOpen && query.trim().length >= 2 && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                        {searchLoading && (
                          <div className="p-4 text-sm text-slate-500">
                            Buscando...
                          </div>
                        )}

                        {!searchLoading && results.length === 0 && (
                          <div className="p-4 text-sm text-slate-500">
                            No se encontraron productos.
                          </div>
                        )}

                        {!searchLoading &&
                          results.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => addProduct(product)}
                              className="block w-full border-b border-slate-100 p-4 text-left transition-colors last:border-b-0 hover:bg-slate-50"
                            >
                              <div className="flex gap-3">
                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                                  {product.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={product.imageUrl}
                                      alt={product.name}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
                                      Sin img
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <p className="text-xs font-bold text-slate-500">
                                    {product.code}
                                  </p>
                                  <p className="font-semibold text-slate-950">
                                    {product.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Stock actual: {product.stock}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {selectedProducts.map((product) => {
                      const stockAfter = getStockAfter(product);
                      const warning =
                        creditActive &&
                        stockAfter >= 0 &&
                        stockAfter <= product.lowStockAlert;

                      return (
                        <div
                          key={product.productId}
                          className={`rounded-2xl border p-4 ${
                            creditActive && stockAfter < 0
                              ? "border-red-200 bg-red-50"
                              : warning
                                ? "border-amber-200 bg-amber-50"
                                : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="grid gap-4 md:grid-cols-[1fr_140px_auto] md:items-center">
                            <div className="flex min-w-0 gap-3">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                                {product.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="h-full w-full object-contain"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
                                    Sin img
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-bold text-slate-500">
                                    {product.code}
                                  </p>

                                  {!product.active && (
                                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                      DADO DE BAJA
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 break-words font-semibold text-slate-950">
                                  {product.name}
                                </p>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-semibold text-slate-600">
                                Cantidad
                              </label>

                              <input
                                type="number"
                                min={1}
                                step={1}
                                value={product.quantity}
                                onWheel={preventNumberWheel}
                                onChange={(e) =>
                                  updateQuantity(
                                    product.productId,
                                    Number(e.target.value),
                                  )
                                }
                                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center font-bold text-slate-900 outline-none focus:border-slate-900"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeProduct(product.productId)}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                            >
                              Quitar
                            </button>
                          </div>

                          <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            <StockMini
                              label="Stock actual"
                              value={String(product.stock)}
                            />
                            <StockMini
                              label="Antes en cuenta"
                              value={String(product.oldQuantity)}
                            />
                            <StockMini
                              label={
                                creditActive
                                  ? "Stock al guardar"
                                  : "Stock sin cambios"
                              }
                              value={String(stockAfter)}
                              danger={creditActive && stockAfter < 0}
                              warning={warning}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {selectedProducts.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                        Esta cuenta no tiene productos asociados.
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                      {error}
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white p-4 sm:p-6">
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={loading}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <ConfirmDialog
          title="Confirmar edición"
          description={
            creditActive
              ? "¿Querés guardar los cambios? El stock se ajustará automáticamente según los productos y cantidades modificadas."
              : "¿Querés guardar los cambios? La cuenta está dada de baja, por lo tanto el stock no se modificará hasta reactivarla."
          }
          confirmText="Guardar cambios"
          loading={loading}
          onConfirm={handleSave}
          onCancel={() => {
            if (loading) return;
            setConfirmOpen(false);
          }}
        />
      )}
    </>
  );
}

function StockMini({
  label,
  value,
  danger = false,
  warning = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2 ring-1 ${
        danger
          ? "bg-red-50 text-red-700 ring-red-200"
          : warning
            ? "bg-amber-50 text-amber-700 ring-amber-200"
            : "bg-white text-slate-700 ring-slate-200"
      }`}
    >
      <p className="text-xs font-semibold opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold leading-none">{value}</p>
    </div>
  );
}
