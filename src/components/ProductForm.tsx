"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: number;
  codePrefix: string;
  name: string;
};

type ProductInitialData = {
  id: number;
  categoryId: number;
  name: string;
  brand: string;
  cost: number;
  cashPrice: number;
  financedPrice: number;
  lowStockAlert: number;
  imageUrl: string;
  active: boolean;
};

function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.ceil(value);
}

function toInputValue(value: number) {
  if (!Number.isFinite(value)) return "";
  return String(roundMoney(value));
}

export default function ProductForm({
  categories,
  mode,
  initialData,
  brandSuggestions = [],
}: {
  categories: Category[];
  mode: "create" | "edit";
  initialData?: ProductInitialData;
  brandSuggestions?: string[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categoryId, setCategoryId] = useState(
    String(initialData?.categoryId ?? categories[0]?.id ?? ""),
  );
  const [name, setName] = useState(initialData?.name ?? "");
  const [brand, setBrand] = useState(initialData?.brand ?? "");
  const [cost, setCost] = useState(
    initialData ? toInputValue(initialData.cost) : "",
  );
  const [cashPrice, setCashPrice] = useState(
    initialData ? toInputValue(initialData.cashPrice) : "",
  );
  const [financingMultiplier, setFinancingMultiplier] = useState("1.65");
  const [financedPrice, setFinancedPrice] = useState(
    initialData ? toInputValue(initialData.financedPrice) : "",
  );
  const [stock, setStock] = useState("0");
  const [lowStockAlert, setLowStockAlert] = useState(
    String(initialData?.lowStockAlert ?? 2),
  );
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "");
  const [active, setActive] = useState(initialData?.active ?? true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function uploadImage(file: File) {
    setError("");

    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }

    try {
      setUploadingImage(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads/product-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo subir la imagen.");
        return;
      }

      setImageUrl(data.imageUrl);
    } catch {
      setError("No se pudo subir la imagen.");
    } finally {
      setUploadingImage(false);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLFormElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (!imageItem) return;

    const file = imageItem.getAsFile();

    if (!file) return;

    e.preventDefault();
    void uploadImage(file);
  }

  function updateFromCost(value: string) {
    setCost(value);

    const parsedCost = Number(value);
    const multiplier = Number(financingMultiplier);

    if (!Number.isFinite(parsedCost) || parsedCost <= 0) return;

    const nextCashPrice = roundMoney(parsedCost * 1.35);
    setCashPrice(String(nextCashPrice));

    if (Number.isFinite(multiplier) && multiplier > 0) {
      setFinancedPrice(String(roundMoney(nextCashPrice * multiplier)));
    }
  }

  function updateFromCashPrice(value: string) {
    setCashPrice(value);

    const parsedCashPrice = Number(value);
    const multiplier = Number(financingMultiplier);

    if (!Number.isFinite(parsedCashPrice) || parsedCashPrice <= 0) return;

    setCost(String(roundMoney(parsedCashPrice / 1.35)));

    if (Number.isFinite(multiplier) && multiplier > 0) {
      setFinancedPrice(String(roundMoney(parsedCashPrice * multiplier)));
    }
  }

  function updateFromMultiplier(value: string) {
    setFinancingMultiplier(value);

    const parsedCashPrice = Number(cashPrice);
    const multiplier = Number(value);

    if (
      !Number.isFinite(parsedCashPrice) ||
      parsedCashPrice <= 0 ||
      !Number.isFinite(multiplier) ||
      multiplier <= 0
    ) {
      return;
    }

    setFinancedPrice(String(roundMoney(parsedCashPrice * multiplier)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    const payload = {
      categoryId: Number(categoryId),
      name: name.trim(),
      brand: brand.trim(),
      cost: Number(cost),
      cashPrice: Number(cashPrice),
      financedPrice: Number(financedPrice),
      stock: Number(stock),
      lowStockAlert: Number(lowStockAlert),
      imageUrl: imageUrl.trim(),
      active,
    };

    if (!Number.isInteger(payload.categoryId)) {
      setError("Seleccioná una categoría.");
      return;
    }

    if (!payload.name) {
      setError("El nombre del producto es obligatorio.");
      return;
    }

    if (!Number.isFinite(payload.cost) || payload.cost < 0) {
      setError("El costo es inválido.");
      return;
    }

    if (!Number.isFinite(payload.cashPrice) || payload.cashPrice <= 0) {
      setError("El precio contado es inválido.");
      return;
    }

    if (!Number.isFinite(payload.financedPrice) || payload.financedPrice <= 0) {
      setError("El precio financiado es inválido.");
      return;
    }

    if (mode === "create") {
      if (!Number.isInteger(payload.stock) || payload.stock < 0) {
        setError("El stock inicial es inválido.");
        return;
      }
    }

    if (!Number.isInteger(payload.lowStockAlert) || payload.lowStockAlert < 0) {
      setError("La alerta de stock bajo es inválida.");
      return;
    }

    setLoading(true);

    const res = await fetch(
      mode === "create"
        ? "/api/productos"
        : `/api/productos/${initialData?.id}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el producto.");
      return;
    }

    router.push("/productos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-950">
          Datos del producto
        </h2>

        <div className="mt-4 grid gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">
              Categoría
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.codePrefix} - {category.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Samsung A15 128GB"
          />

          <div>
            <label className="text-sm font-medium text-slate-700">Marca</label>
            <input
              list="brand-suggestions"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ej: Samsung"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
            />

            <datalist id="brand-suggestions">
              {brandSuggestions.map((brandName) => (
                <option key={brandName} value={brandName} />
              ))}
            </datalist>

            <p className="mt-1 text-xs text-slate-500">
              Podés elegir una marca existente o escribir una nueva.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Imagen del producto
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Podés pegar una imagen con Ctrl+V o elegirla desde tu
                  dispositivo.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingImage ? "Subiendo..." : "Elegir imagen"}
                </button>

                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    disabled={uploadingImage}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";

                if (file) {
                  void uploadImage(file);
                }
              }}
            />

            <div className="mt-4">
              <label className="text-sm font-medium text-slate-700">
                URL de imagen
              </label>
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
              />
            </div>

            {imageUrl && (
              <div className="mt-4 h-36 w-36 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-950">Precios</h2>

        <p className="mt-1 text-sm text-slate-500">
          Podés cargar costo o contado. El sistema calcula valores sugeridos,
          pero el precio financiado puede editarse manualmente.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input
            label="Costo"
            type="number"
            min="0"
            step="0.01"
            value={cost}
            onChange={(e) => updateFromCost(e.target.value)}
          />

          <Input
            label="Precio contado"
            type="number"
            min="1"
            step="0.01"
            value={cashPrice}
            onChange={(e) => updateFromCashPrice(e.target.value)}
          />

          <Input
            label="Multiplicador financiación"
            type="number"
            min="0.01"
            step="0.01"
            value={financingMultiplier}
            onChange={(e) => updateFromMultiplier(e.target.value)}
          />

          <Input
            label="Precio financiado"
            type="number"
            min="1"
            step="0.01"
            value={financedPrice}
            onChange={(e) => setFinancedPrice(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold text-slate-950">Stock</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {mode === "create" && (
            <Input
              label="Stock inicial"
              type="number"
              min="0"
              step="1"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
          )}

          <Input
            label="Alerta stock bajo"
            type="number"
            min="0"
            step="1"
            value={lowStockAlert}
            onChange={(e) => setLowStockAlert(e.target.value)}
          />
        </div>

        {mode === "edit" && (
          <p className="mt-3 text-sm text-slate-500">
            El stock se modifica desde “Ajustar stock” para dejar registro del
            movimiento.
          </p>
        )}
      </div>

      {mode === "edit" && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Producto activo
          </label>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/productos")}
          disabled={loading || uploadingImage}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancelar
        </button>

        <button
          type="submit"
          disabled={loading || uploadingImage}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar producto"}
        </button>
      </div>
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
