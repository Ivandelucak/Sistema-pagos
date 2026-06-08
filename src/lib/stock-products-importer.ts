//src/lib/stock-products-importer.ts

import * as XLSX from "xlsx";

const CASH_MARKUP = 1.35;
const FINANCED_MULTIPLIER = 1.65;
const DEFAULT_STOCK = 0;
const DEFAULT_LOW_STOCK_ALERT = 2;

type DbClient = {
  productCategory: any;
  stockProduct: any;
};

type CategorySeed = {
  codePrefix: string;
  name: string;
  slug: string;
  displayOrder: number;
};

type ProductCategoryRecord = {
  id: number;
  codePrefix: string;
  name: string;
  slug: string;
};

type ProductCategoryWithProductsRecord = ProductCategoryRecord & {
  products: Array<{
    code: string;
  }>;
};

type StockProductRecord = {
  id: number;
  name: string;
  categoryId: number;
  sourceWebCode: string | null;
  code: string;
  imageUrl: string | null;
};

type ImportRow = {
  rowNumber: number;
  sourceWebCode: string | null;
  name: string;
  brand: string | null;
  categoryName: string;
  categorySlug: string;
  subcategoryName: string;
  subcategorySlug: string;
  cashPrice: number;
  cost: number;
  financedPrice: number;
  imageUrl: string | null;
  active: boolean;
};

export type StockProductSkippedRow = {
  rowNumber: number;
  name: string;
  reason: string;
};

export type StockProductsImportResult = {
  sheetName: string;
  rowsRead: number;
  validRows: number;
  created: number;
  updated: number;
  stockInitial: number;
  lowStockAlertInitial: number;
  withMainImage: number;
  withFallbackImage: number;
  withoutImage: number;
  byCategory: Record<string, number>;
  skippedRows: StockProductSkippedRow[];
};

const CATEGORY_SEEDS: CategorySeed[] = [
  { codePrefix: "001", name: "Celulares", slug: "celulares", displayOrder: 1 },
  { codePrefix: "002", name: "Parlantes", slug: "parlantes", displayOrder: 2 },
  { codePrefix: "003", name: "Audio", slug: "audio", displayOrder: 3 },
  {
    codePrefix: "004",
    name: "Tecnología",
    slug: "tecnologia",
    displayOrder: 4,
  },
  {
    codePrefix: "005",
    name: "TV y video",
    slug: "tv-y-video",
    displayOrder: 5,
  },
  {
    codePrefix: "006",
    name: "Electrodomésticos",
    slug: "electrodomesticos",
    displayOrder: 6,
  },
  {
    codePrefix: "007",
    name: "Pequeños electrodomésticos",
    slug: "pequenos-electrodomesticos",
    displayOrder: 7,
  },
  {
    codePrefix: "008",
    name: "Climatización",
    slug: "climatizacion",
    displayOrder: 8,
  },
  { codePrefix: "009", name: "Hogar", slug: "hogar", displayOrder: 9 },
  {
    codePrefix: "010",
    name: "Muebles y colchones",
    slug: "muebles-y-colchones",
    displayOrder: 10,
  },
  {
    codePrefix: "011",
    name: "Herramientas",
    slug: "herramientas",
    displayOrder: 11,
  },
  {
    codePrefix: "012",
    name: "Bicicletas",
    slug: "bicicletas",
    displayOrder: 12,
  },
  {
    codePrefix: "013",
    name: "Cuidado personal",
    slug: "cuidado-personal",
    displayOrder: 13,
  },
];

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

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function cleanOptionalText(value: unknown) {
  const text = cleanText(value);
  return text ? text : null;
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;

  const raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/\$/g, "");

  if (!raw) return NaN;

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma && hasDot) {
    return Number(raw.replace(/\./g, "").replace(",", "."));
  }

  if (hasComma && !hasDot) {
    return Number(raw.replace(",", "."));
  }

  return Number(raw);
}

function roundMoneyUp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.ceil(value);
}

function parseActive(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  const normalized = normalizeText(String(value ?? ""));

  if (!normalized) return true;

  if (
    ["1", "si", "sí", "true", "activo", "activa", "yes"].includes(normalized)
  ) {
    return true;
  }

  if (
    ["0", "no", "false", "inactivo", "inactiva", "baja", "borrado"].includes(
      normalized,
    )
  ) {
    return false;
  }

  return true;
}

function getFirstSheet(workbook: XLSX.WorkBook) {
  const preferredSheet = workbook.SheetNames.find(
    (sheetName) => normalizeText(sheetName) === "productos",
  );

  const sheetName = preferredSheet ?? workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("El Excel no tiene hojas.");
  }

  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`No se pudo leer la hoja ${sheetName}.`);
  }

  return { sheetName, sheet };
}

function normalizeHeaderKey(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeRowKeys(row: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeaderKey(key)] = value;
  }

  return normalized;
}

function getCell(row: Record<string, unknown>, possibleKeys: string[]) {
  for (const key of possibleKeys) {
    const normalizedKey = normalizeHeaderKey(key);

    if (Object.prototype.hasOwnProperty.call(row, normalizedKey)) {
      return row[normalizedKey];
    }
  }

  return "";
}

function splitImages(value: unknown) {
  const raw = cleanText(value);

  if (!raw) return [];

  return raw
    .split(/[\n\r,;|]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getProductImage(row: Record<string, unknown>) {
  const mainImage = cleanOptionalText(
    getCell(row, ["imagen_principal", "imagen principal", "image", "imagen"]),
  );

  if (mainImage) {
    return {
      imageUrl: mainImage,
      source: "main" as const,
    };
  }

  const images = splitImages(getCell(row, ["imagenes", "imágenes", "images"]));
  const firstImage = images[0] ?? null;

  return {
    imageUrl: firstImage,
    source: firstImage ? ("fallback" as const) : ("none" as const),
  };
}

function mapCategorySlug({
  categoryName,
  categorySlug,
  subcategoryName,
  subcategorySlug,
  productName,
}: {
  categoryName: string;
  categorySlug: string;
  subcategoryName: string;
  subcategorySlug: string;
  productName: string;
}) {
  const text = normalizeText(
    [
      categoryName,
      categorySlug,
      subcategoryName,
      subcategorySlug,
      productName,
    ].join(" "),
  );

  if (text.includes("celular") || text.includes("smartphone")) {
    return "celulares";
  }

  if (text.includes("parlante") || text.includes("speaker")) {
    return "parlantes";
  }

  if (
    text.includes("auricular") ||
    text.includes("microfono") ||
    text.includes("audio") ||
    text.includes("radio") ||
    text.includes("stereo") ||
    text.includes("estereo")
  ) {
    return "audio";
  }

  if (
    text.includes("tv") ||
    text.includes("televisor") ||
    text.includes("smart tv") ||
    text.includes("video") ||
    text.includes("monitor")
  ) {
    return "tv-y-video";
  }

  if (
    text.includes("notebook") ||
    text.includes("tablet") ||
    text.includes("computacion") ||
    text.includes("informatica") ||
    text.includes("tecnologia") ||
    text.includes("gaming") ||
    text.includes("impresora")
  ) {
    return "tecnologia";
  }

  if (
    text.includes("heladera") ||
    text.includes("freezer") ||
    text.includes("lavarropas") ||
    text.includes("secarropas") ||
    text.includes("cocina") ||
    text.includes("horno") ||
    text.includes("microondas") ||
    text.includes("termotanque") ||
    text.includes("electrodomestico")
  ) {
    return "electrodomesticos";
  }

  if (
    text.includes("pava") ||
    text.includes("licuadora") ||
    text.includes("batidora") ||
    text.includes("cafetera") ||
    text.includes("tostadora") ||
    text.includes("freidora") ||
    text.includes("procesadora") ||
    text.includes("mixer") ||
    text.includes("sandwichera") ||
    text.includes("plancha")
  ) {
    return "pequenos-electrodomesticos";
  }

  if (
    text.includes("aire") ||
    text.includes("ventilador") ||
    text.includes("calefactor") ||
    text.includes("estufa") ||
    text.includes("climatizacion") ||
    text.includes("caloventor")
  ) {
    return "climatizacion";
  }

  if (
    text.includes("colchon") ||
    text.includes("mueble") ||
    text.includes("mesa") ||
    text.includes("silla") ||
    text.includes("sillon") ||
    text.includes("ropero") ||
    text.includes("placard") ||
    text.includes("cama") ||
    text.includes("respaldo")
  ) {
    return "muebles-y-colchones";
  }

  if (
    text.includes("herramienta") ||
    text.includes("taladro") ||
    text.includes("amoladora") ||
    text.includes("soldadora") ||
    text.includes("compresor") ||
    text.includes("hidrolavadora") ||
    text.includes("motosierra") ||
    text.includes("atornillador")
  ) {
    return "herramientas";
  }

  if (
    text.includes("bicicleta") ||
    text.includes("bici") ||
    text.includes("rodado")
  ) {
    return "bicicletas";
  }

  if (
    text.includes("afeitadora") ||
    text.includes("depiladora") ||
    text.includes("secador") ||
    text.includes("planchita") ||
    text.includes("cuidado personal") ||
    text.includes("cortadora")
  ) {
    return "cuidado-personal";
  }

  return "hogar";
}

function parseImportRows(rawRows: Record<string, unknown>[]) {
  const rows: ImportRow[] = [];
  const skippedRows: StockProductSkippedRow[] = [];
  const imageStats = {
    withMainImage: 0,
    withFallbackImage: 0,
    withoutImage: 0,
  };

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const row = normalizeRowKeys(rawRow);

    const name = cleanText(getCell(row, ["nombre", "producto", "name"]));

    const sourceWebCode = cleanOptionalText(
      getCell(row, ["codigo", "código", "code", "sku"]),
    );

    const brand = cleanOptionalText(getCell(row, ["marca", "brand"]));

    const categoryName = cleanText(getCell(row, ["categoria", "categoría"]));
    const categorySlug = cleanText(getCell(row, ["categoria_slug"]));
    const subcategoryName = cleanText(
      getCell(row, ["subcategoria", "subcategoría"]),
    );
    const subcategorySlug = cleanText(getCell(row, ["subcategoria_slug"]));

    const active = parseActive(getCell(row, ["activo", "active"]));

    if (!active) {
      skippedRows.push({
        rowNumber,
        name: name || "-",
        reason: "Producto inactivo en Excel",
      });
      return;
    }

    if (!name) {
      skippedRows.push({
        rowNumber,
        name: "-",
        reason: "Nombre vacío",
      });
      return;
    }

    const cashPrice = parseNumber(
      getCell(row, [
        "precio_contado",
        "precio contado",
        "contado",
        "precio",
        "price",
      ]),
    );

    if (!Number.isFinite(cashPrice) || cashPrice <= 0) {
      skippedRows.push({
        rowNumber,
        name,
        reason: "Precio contado inválido",
      });
      return;
    }

    const { imageUrl, source } = getProductImage(row);

    if (source === "main") imageStats.withMainImage += 1;
    if (source === "fallback") imageStats.withFallbackImage += 1;
    if (source === "none") imageStats.withoutImage += 1;

    rows.push({
      rowNumber,
      sourceWebCode,
      name,
      brand,
      categoryName,
      categorySlug,
      subcategoryName,
      subcategorySlug,
      cashPrice: roundMoneyUp(cashPrice),
      cost: roundMoneyUp(cashPrice / CASH_MARKUP),
      financedPrice: roundMoneyUp(cashPrice * FINANCED_MULTIPLIER),
      imageUrl,
      active,
    });
  });

  return {
    rows,
    skippedRows,
    ...imageStats,
  };
}

async function ensureCategories(db: DbClient) {
  for (const category of CATEGORY_SEEDS) {
    await db.productCategory.upsert({
      where: {
        slug: category.slug,
      },
      update: {
        codePrefix: category.codePrefix,
        name: category.name,
        displayOrder: category.displayOrder,
        active: true,
      },
      create: {
        codePrefix: category.codePrefix,
        name: category.name,
        slug: category.slug,
        displayOrder: category.displayOrder,
        active: true,
      },
    });
  }

  const categories = (await db.productCategory.findMany({
    where: {
      active: true,
    },
    select: {
      id: true,
      codePrefix: true,
      name: true,
      slug: true,
    },
  })) as ProductCategoryRecord[];

  return new Map<string, ProductCategoryRecord>(
    categories.map((category) => [category.slug, category]),
  );
}

async function getCategoryCounters(db: DbClient) {
  const categories = (await db.productCategory.findMany({
    select: {
      id: true,
      slug: true,
      codePrefix: true,
      name: true,
      products: {
        select: {
          code: true,
        },
      },
    },
  })) as ProductCategoryWithProductsRecord[];

  const counters = new Map<string, number>();

  for (const category of categories) {
    const maxNumber = category.products.reduce((max, product) => {
      const [, rawNumber] = product.code.split("-");
      const parsed = Number(rawNumber);

      if (!Number.isInteger(parsed)) return max;

      return Math.max(max, parsed);
    }, 0);

    counters.set(category.slug, maxNumber);
  }

  return counters;
}

function makeFallbackKey(name: string, categoryId: number) {
  return `${categoryId}::${normalizeText(name)}`;
}

async function importRows({
  db,
  rows,
  imageStats,
}: {
  db: DbClient;
  rows: ImportRow[];
  imageStats: {
    withMainImage: number;
    withFallbackImage: number;
    withoutImage: number;
  };
}) {
  const categoryMap = await ensureCategories(db);
  const counters = await getCategoryCounters(db);

  const existingProducts = (await db.stockProduct.findMany({
    select: {
      id: true,
      name: true,
      categoryId: true,
      sourceWebCode: true,
      code: true,
      imageUrl: true,
    },
  })) as StockProductRecord[];

  const existingBySourceWebCode = new Map<string, StockProductRecord>(
    existingProducts
      .filter((product) => Boolean(product.sourceWebCode))
      .map((product) => [String(product.sourceWebCode), product]),
  );

  const existingByFallback = new Map<string, StockProductRecord>(
    existingProducts.map((product) => [
      makeFallbackKey(product.name, product.categoryId),
      product,
    ]),
  );

  const stats = {
    created: 0,
    updated: 0,
    skippedRows: [] as StockProductSkippedRow[],
    byCategory: {} as Record<string, number>,
    withMainImage: imageStats.withMainImage,
    withFallbackImage: imageStats.withFallbackImage,
    withoutImage: imageStats.withoutImage,
  };

  for (const row of rows) {
    const categorySlug = mapCategorySlug({
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      subcategoryName: row.subcategoryName,
      subcategorySlug: row.subcategorySlug,
      productName: row.name,
    });

    const category = categoryMap.get(categorySlug);

    if (!category) {
      stats.skippedRows.push({
        rowNumber: row.rowNumber,
        name: row.name,
        reason: `Categoría interna no encontrada: ${categorySlug}`,
      });
      continue;
    }

    stats.byCategory[category.name] =
      (stats.byCategory[category.name] ?? 0) + 1;

    const fallbackKey = makeFallbackKey(row.name, category.id);

    const existing =
      (row.sourceWebCode
        ? existingBySourceWebCode.get(row.sourceWebCode)
        : undefined) ?? existingByFallback.get(fallbackKey);

    if (existing) {
      await db.stockProduct.update({
        where: {
          id: existing.id,
        },
        data: {
          name: row.name,
          slug: makeSlug(row.name),
          categoryId: category.id,
          brand: row.brand,
          sourceWebCode: row.sourceWebCode,
          cost: row.cost,
          cashPrice: row.cashPrice,
          financedPrice: row.financedPrice,
          active: true,
          ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
        },
      });

      stats.updated += 1;
      continue;
    }

    const nextNumber = (counters.get(category.slug) ?? 0) + 1;
    counters.set(category.slug, nextNumber);

    const code = `${category.codePrefix}-${String(nextNumber).padStart(4, "0")}`;

    const created = (await db.stockProduct.create({
      data: {
        code,
        name: row.name,
        slug: makeSlug(row.name),
        categoryId: category.id,
        brand: row.brand,
        sourceWebCode: row.sourceWebCode,
        cost: row.cost,
        cashPrice: row.cashPrice,
        financedPrice: row.financedPrice,
        stock: DEFAULT_STOCK,
        lowStockAlert: DEFAULT_LOW_STOCK_ALERT,
        imageUrl: row.imageUrl,
        active: true,
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
        sourceWebCode: true,
        code: true,
        imageUrl: true,
      },
    })) as StockProductRecord;

    if (created.sourceWebCode) {
      existingBySourceWebCode.set(created.sourceWebCode, created);
    }

    existingByFallback.set(
      makeFallbackKey(created.name, created.categoryId),
      created,
    );

    stats.created += 1;
  }

  return stats;
}

export async function importStockProductsFromWorkbook({
  db,
  workbook,
}: {
  db: DbClient;
  workbook: XLSX.WorkBook;
}): Promise<StockProductsImportResult> {
  const { sheetName, sheet } = getFirstSheet(workbook);

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  const parsed = parseImportRows(rawRows);

  const stats = await importRows({
    db,
    rows: parsed.rows,
    imageStats: {
      withMainImage: parsed.withMainImage,
      withFallbackImage: parsed.withFallbackImage,
      withoutImage: parsed.withoutImage,
    },
  });

  return {
    sheetName,
    rowsRead: rawRows.length,
    validRows: parsed.rows.length,
    created: stats.created,
    updated: stats.updated,
    stockInitial: DEFAULT_STOCK,
    lowStockAlertInitial: DEFAULT_LOW_STOCK_ALERT,
    withMainImage: stats.withMainImage,
    withFallbackImage: stats.withFallbackImage,
    withoutImage: stats.withoutImage,
    byCategory: stats.byCategory,
    skippedRows: [...parsed.skippedRows, ...stats.skippedRows],
  };
}

export async function importStockProductsFromBuffer({
  db,
  buffer,
}: {
  db: DbClient;
  buffer: Buffer;
}) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
  });

  return importStockProductsFromWorkbook({
    db,
    workbook,
  });
}
