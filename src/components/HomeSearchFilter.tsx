"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type SearchResult = {
  id: number;
  nombre: string;
  vendedor: string;
  cuentasActivas: number;
  saldoPendiente: number;
};

type Vendedor = {
  id: number;
  nombre: string;
};

type HomeSort = "az" | "za" | "dueAsc" | "dueDesc";

export default function HomeSearchFilter({
  search,
  sort,
  vendedorId,
  vendedores,
}: {
  search: string;
  sort: HomeSort;
  vendedorId?: number;
  vendedores: Vendedor[];
}) {
  const [query, setQuery] = useState(search);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const value = query.trim();

    if (value.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);

        const res = await fetch(
          `/api/clientes/search?q=${encodeURIComponent(value)}`,
          { signal: controller.signal },
        );

        const data = await res.json();

        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <form className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-3 md:flex-row">
        <div ref={wrapperRef} className="relative w-full">
          <input
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 3) setOpen(true);
            }}
            placeholder="Buscar cliente..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-900"
          />

          {query.trim().length > 0 && query.trim().length < 3 && (
            <p className="mt-1 text-xs text-slate-500">
              Escribí al menos 3 letras para buscar.
            </p>
          )}

          {open && query.trim().length >= 3 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {loading && (
                <div className="p-4 text-sm text-slate-500">Buscando...</div>
              )}

              {!loading && results.length === 0 && (
                <div className="p-4 text-sm text-slate-500">
                  No se encontraron clientes.
                </div>
              )}

              {!loading &&
                results.map((cliente) => (
                  <Link
                    key={cliente.id}
                    href={`/clientes/${cliente.id}`}
                    className="block border-b border-slate-100 p-4 last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          {cliente.nombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          Vendedor: {cliente.vendedor}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">Saldo</p>
                        <p className="text-sm font-bold text-red-600">
                          ${cliente.saldoPendiente.toLocaleString("es-AR")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>

        <select
          name="vendedorId"
          defaultValue={vendedorId ?? ""}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
        >
          <option value="">Todos</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
            </option>
          ))}
        </select>

        <select
          name="order"
          defaultValue={sort}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-900"
        >
          <option value="az">Cliente A-Z</option>
          <option value="za">Cliente Z-A</option>
          <option value="dueAsc">Vencimiento próximo</option>
          <option value="dueDesc">Vencimiento lejano</option>
        </select>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
        >
          Aplicar
        </button>

        {(search || vendedorId || sort !== "az") && (
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Limpiar
          </Link>
        )}
      </div>
    </form>
  );
}
