//src/components/NuevaCuentaForm.tsx

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type VendedorOption = {
  id: number;
  nombre: string;
};

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

type SelectedProduct = ProductSearchResult & {
  quantity: number;
};

function getTodayInputValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 10);
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  });
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("es-AR", {
    maximumFractionDigits: 0,
  })}`;
}

function formatInputDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return "-";

  return new Date(year, month - 1, day).toLocaleDateString("es-AR");
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, "");
}

export default function NuevaCuentaForm({
  clientId,
  clienteNombre,
  vendedorId,
  vendedorNombre,
  vendedores,
}: {
  clientId: number;
  clienteNombre: string;
  vendedorId: number;
  vendedorNombre: string;
  vendedores: VendedorOption[];
}) {
  const router = useRouter();
  const productSearchRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<ProductSearchResult[]>(
    [],
  );
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    [],
  );

  const [form, setForm] = useState({
    tipo: "",
    fechaInicio: getTodayInputValue(),
    frecuenciaDias: "7",
    total: "",
    cantidadCuotas: "",
    vendedorId: String(vendedorId),
  });

  const total = Number(form.total);
  const cantidadCuotas = Number(form.cantidadCuotas);
  const frecuenciaDias = Number(form.frecuenciaDias);
  const selectedVendedorId = Number(form.vendedorId);

  const vendedorSeleccionado = useMemo(() => {
    if (!Number.isInteger(selectedVendedorId)) return null;

    return (
      vendedores.find((vendedor) => vendedor.id === selectedVendedorId) ?? null
    );
  }, [selectedVendedorId, vendedores]);

  const valorCuota = useMemo(() => {
    if (
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isInteger(cantidadCuotas) ||
      cantidadCuotas <= 0
    ) {
      return 0;
    }

    return total / cantidadCuotas;
  }, [total, cantidadCuotas]);

  const productsCashTotal = useMemo(() => {
    return selectedProducts.reduce(
      (acc, product) => acc + product.cashPrice * product.quantity,
      0,
    );
  }, [selectedProducts]);

  const productsFinancedTotal = useMemo(() => {
    return selectedProducts.reduce(
      (acc, product) => acc + product.financedPrice * product.quantity,
      0,
    );
  }, [selectedProducts]);

  const resumenValido =
    form.fechaInicio &&
    Number.isFinite(total) &&
    total > 0 &&
    Number.isInteger(cantidadCuotas) &&
    cantidadCuotas > 0 &&
    Number.isInteger(frecuenciaDias) &&
    frecuenciaDias > 0 &&
    vendedorSeleccionado;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        productSearchRef.current &&
        !productSearchRef.current.contains(e.target as Node)
      ) {
        setProductSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const value = productQuery.trim();

    if (value.length < 2) {
      setProductResults([]);
      setProductSearchOpen(false);
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(async () => {
      try {
        setProductLoading(true);

        const params = new URLSearchParams();
        params.set("q", value);

        const res = await fetch(`/api/productos/search?${params.toString()}`, {
          signal: controller.signal,
        });

        const data = await res.json();

        setProductResults(data.products ?? []);
        setProductSearchOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setProductResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setProductLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [productQuery]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  }

  function addProduct(product: ProductSearchResult) {
    setError("");

    if (product.stock <= 0) {
      setError("No podés agregar un producto sin stock.");
      return;
    }

    setSelectedProducts((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        if (existing.quantity >= product.stock) {
          setError(
            `No hay stock suficiente para agregar más unidades de ${product.code}.`,
          );
          return current;
        }

        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
        },
      ];
    });

    setProductQuery("");
    setProductResults([]);
    setProductSearchOpen(false);

    if (!form.tipo.trim()) {
      setForm((current) => ({
        ...current,
        tipo: "Productos",
      }));
    }
  }

  function updateProductQuantity(productId: number, quantity: number) {
    setError("");

    setSelectedProducts((current) =>
      current.map((product) => {
        if (product.id !== productId) return product;

        const safeQuantity = Number.isInteger(quantity) ? quantity : 1;

        return {
          ...product,
          quantity: Math.min(Math.max(safeQuantity, 1), product.stock),
        };
      }),
    );
  }

  function removeProduct(productId: number) {
    setSelectedProducts((current) =>
      current.filter((product) => product.id !== productId),
    );
  }

  function useProductsFinancedTotal() {
    if (productsFinancedTotal <= 0) return;

    setForm((current) => ({
      ...current,
      total: String(productsFinancedTotal),
      tipo: current.tipo.trim() || "Productos",
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const selectedProductsPayload = selectedProducts.map((product) => ({
      productId: product.id,
      quantity: product.quantity,
    }));

    for (const product of selectedProducts) {
      if (!Number.isInteger(product.quantity) || product.quantity <= 0) {
        setError(`Cantidad inválida para ${product.code} · ${product.name}.`);
        return;
      }

      if (product.quantity > product.stock) {
        setError(
          `Stock insuficiente para ${product.code} · ${product.name}. Stock actual: ${product.stock}`,
        );
        return;
      }
    }

    const payload = {
      clientId,
      vendedorId: Number(form.vendedorId),
      tipo: form.tipo.trim(),
      fechaInicio: form.fechaInicio,
      frecuenciaDias: Number(form.frecuenciaDias),
      total: Number(form.total),
      cantidadCuotas: Number(form.cantidadCuotas),
      products: selectedProductsPayload,
    };

    if (!payload.tipo) {
      setError("Ingresá el tipo de cuenta.");
      return;
    }

    if (!Number.isInteger(payload.vendedorId)) {
      setError("Seleccioná un vendedor para esta cuenta.");
      return;
    }

    if (!payload.fechaInicio) {
      setError("Ingresá la fecha inicial.");
      return;
    }

    if (
      !Number.isInteger(payload.frecuenciaDias) ||
      payload.frecuenciaDias <= 0
    ) {
      setError("La frecuencia debe ser mayor a 0.");
      return;
    }

    if (!Number.isFinite(payload.total) || payload.total <= 0) {
      setError("El total debe ser mayor a 0.");
      return;
    }

    if (
      !Number.isInteger(payload.cantidadCuotas) ||
      payload.cantidadCuotas <= 0
    ) {
      setError("La cantidad de cuotas debe ser mayor a 0.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/creditos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al crear cuenta.");
      return;
    }

    router.push(`/cuentas/${data.creditId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-950">
          Datos de la cuenta
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Cliente:{" "}
          <span className="font-medium text-slate-700">{clienteNombre}</span> ·
          Vendedor principal:{" "}
          <span className="font-medium text-slate-700">{vendedorNombre}</span>
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">
          Información principal
        </p>

        <div className="mt-4 space-y-4">
          <Input
            label="Tipo de cuenta"
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            placeholder="Ej: crédito, producto, préstamo"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Fecha inicial"
              name="fechaInicio"
              type="date"
              value={form.fechaInicio}
              onChange={handleChange}
            />

            <Input
              label="Frecuencia de cobro (días)"
              name="frecuenciaDias"
              type="number"
              min="1"
              step="1"
              value={form.frecuenciaDias}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">
          Productos asociados
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          Buscá por código con guion, sin guion o por nombre. Ej: 001-0001,
          0010001 o Samsung.
        </p>

        <div ref={productSearchRef} className="relative mt-4">
          <input
            value={productQuery}
            onChange={(e) => {
              setProductQuery(e.target.value);
              setError("");
            }}
            onFocus={() => {
              if (productQuery.trim().length >= 2) {
                setProductSearchOpen(true);
              }
            }}
            placeholder="Buscar producto por código o nombre..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
          />

          {productQuery.trim().length > 0 && productQuery.trim().length < 2 && (
            <p className="mt-1 text-xs text-slate-500">
              Escribí al menos 2 caracteres para buscar.
            </p>
          )}

          {productSearchOpen && productQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
              {productLoading && (
                <div className="p-4 text-sm text-slate-500">Buscando...</div>
              )}

              {!productLoading && productResults.length === 0 && (
                <div className="p-4 text-sm text-slate-500">
                  No se encontraron productos.
                </div>
              )}

              {!productLoading &&
                productResults.map((product) => {
                  const alreadySelected = selectedProducts.find(
                    (item) => item.id === product.id,
                  );

                  const selectedQuantity = alreadySelected?.quantity ?? 0;
                  const afterAddingOne = product.stock - selectedQuantity - 1;
                  const canAdd = afterAddingOne >= 0;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      disabled={!canAdd}
                      className="block w-full border-b border-slate-100 p-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex gap-3">
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
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

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-500">
                            {product.code}
                          </p>

                          <p className="mt-0.5 font-semibold text-slate-950">
                            {product.name}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {product.categoryCodePrefix} ·{" "}
                            {product.categoryName}
                            {product.brand ? ` · ${product.brand}` : ""}
                          </p>

                          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
                            <StockMini
                              label="Stock actual"
                              value={String(product.stock)}
                            />

                            <StockMini
                              label={
                                alreadySelected
                                  ? "Ya seleccionado"
                                  : "Al agregar"
                              }
                              value={
                                alreadySelected ? String(selectedQuantity) : "1"
                              }
                            />

                            <StockMini
                              label="Stock posterior"
                              value={String(Math.max(afterAddingOne, 0))}
                              danger={!canAdd}
                            />
                          </div>
                        </div>

                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-slate-500">Financiado</p>
                          <p className="font-bold text-slate-950">
                            {formatMoney(product.financedPrice)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {selectedProducts.length > 0 && (
          <div className="mt-5 space-y-3">
            {selectedProducts.map((product) => {
              const stockAfter = product.stock - product.quantity;
              const isLowAfter =
                stockAfter >= 0 && stockAfter <= product.lowStockAlert;

              const cardClass =
                stockAfter < 0
                  ? "border-red-200 bg-red-50"
                  : isLowAfter
                    ? "border-amber-200 bg-amber-50"
                    : "border-slate-200 bg-slate-50";

              return (
                <div
                  key={product.id}
                  className={`rounded-2xl border p-4 shadow-sm ${cardClass}`}
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_180px] lg:items-start">
                    <div className="flex min-w-0 gap-3">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
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
                        <p className="text-xs font-bold text-slate-500">
                          {product.code}
                        </p>

                        <p className="mt-1 break-words text-base font-bold leading-5 text-slate-950">
                          {product.name}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {product.categoryCodePrefix} · {product.categoryName}
                          {product.brand ? ` · ${product.brand}` : ""}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                            Contado: {formatMoney(product.cashPrice)}
                          </span>

                          <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                            Financiado: {formatMoney(product.financedPrice)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Cantidad
                      </label>

                      <input
                        type="number"
                        min={1}
                        max={product.stock}
                        step={1}
                        value={product.quantity}
                        onChange={(e) =>
                          updateProductQuantity(
                            product.id,
                            Number(e.target.value),
                          )
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-lg font-bold text-slate-900 outline-none focus:border-slate-900"
                      />

                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <StockMini
                      label="Stock actual"
                      value={String(product.stock)}
                    />

                    <StockMini
                      label="Se descuenta"
                      value={String(product.quantity)}
                    />

                    <StockMini
                      label="Stock final"
                      value={String(stockAfter)}
                      danger={stockAfter < 0}
                      warning={isLowAfter}
                    />
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-400">
                    Total sugerido por productos
                  </p>

                  <p className="mt-1 text-sm text-slate-300">
                    Contado:{" "}
                    <span className="font-semibold text-white">
                      {formatMoney(productsCashTotal)}
                    </span>{" "}
                    · Financiado:{" "}
                    <span className="font-semibold text-white">
                      {formatMoney(productsFinancedTotal)}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={useProductsFinancedTotal}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md active:scale-[0.98]"
                >
                  Usar total financiado
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">
          Vendedor de la cuenta
        </p>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700">
            Seleccionar vendedor
          </label>

          <select
            name="vendedorId"
            value={form.vendedorId}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
          >
            <option value="">Seleccionar vendedor...</option>

            {vendedores.map((vendedor) => (
              <option key={vendedor.id} value={vendedor.id}>
                {vendedor.nombre}
                {vendedor.id === vendedorId ? " · principal" : ""}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            Por defecto se usa el vendedor principal del cliente, pero esta
            cuenta puede asignarse a otro vendedor activo.
          </p>

          {vendedores.length === 0 && (
            <p className="mt-2 text-sm font-medium text-red-600">
              No hay vendedores activos cargados.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">
          Condiciones de pago
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="Total"
            name="total"
            type="number"
            min="1"
            step="1"
            value={form.total}
            onChange={handleChange}
            placeholder="Ej: 70000"
          />

          <Input
            label="Cantidad de cuotas"
            name="cantidadCuotas"
            type="number"
            min="1"
            step="1"
            value={form.cantidadCuotas}
            onChange={handleChange}
            placeholder="Ej: 7"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-400">
              Valor de cuota calculado
            </p>

            <p className="mt-1 text-3xl font-bold">
              ${formatCurrency(valorCuota)}
            </p>
          </div>

          <div className="text-sm text-slate-300 md:text-right">
            <p>
              Total:{" "}
              <span className="font-semibold text-white">
                {Number.isFinite(total) && total > 0
                  ? `$${formatCurrency(total)}`
                  : "-"}
              </span>
            </p>

            <p>
              Cuotas:{" "}
              <span className="font-semibold text-white">
                {Number.isInteger(cantidadCuotas) && cantidadCuotas > 0
                  ? cantidadCuotas
                  : "-"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">Resumen operativo</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <SummaryItem label="Cliente" value={clienteNombre} />

          <SummaryItem
            label="Vendedor de cuenta"
            value={vendedorSeleccionado?.nombre ?? "-"}
          />

          <SummaryItem
            label="Fecha inicial"
            value={formatInputDate(form.fechaInicio)}
          />

          <SummaryItem
            label="Frecuencia"
            value={
              Number.isInteger(frecuenciaDias) && frecuenciaDias > 0
                ? `Cada ${frecuenciaDias} día${frecuenciaDias === 1 ? "" : "s"}`
                : "-"
            }
          />

          <SummaryItem
            label="Total"
            value={
              Number.isFinite(total) && total > 0
                ? `$${formatCurrency(total)}`
                : "-"
            }
          />

          <SummaryItem
            label="Cantidad de cuotas"
            value={
              Number.isInteger(cantidadCuotas) && cantidadCuotas > 0
                ? String(cantidadCuotas)
                : "-"
            }
          />

          <SummaryItem
            label="Productos asociados"
            value={
              selectedProducts.length > 0
                ? `${selectedProducts.length} producto${
                    selectedProducts.length === 1 ? "" : "s"
                  }`
                : "-"
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Importante</p>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Esta cuenta quedará asociada al vendedor seleccionado. Si agregás
          productos, el stock se descontará automáticamente al crear la cuenta.
        </p>
      </div>

      {!resumenValido && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">
            Completá los datos principales para ver el resumen completo de la
            cuenta.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || vendedores.length === 0}
        className="w-full rounded-xl bg-slate-900 py-3 font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>

      <input
        {...props}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
      />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
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
      <p className="text-xs font-semibold text-current opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold leading-none">{value}</p>
    </div>
  );
}
