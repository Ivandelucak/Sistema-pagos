"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ObservacionTipo = "NORMAL" | "ALERTA";

export default function ClientObservationForm({
  clientId,
  initialValue,
  initialType,
  canEdit,
}: {
  clientId: number;
  initialValue: string;
  initialType: ObservacionTipo;
  canEdit: boolean;
}) {
  const router = useRouter();

  const [observacion, setObservacion] = useState(initialValue);
  const [observacionTipo, setObservacionTipo] =
    useState<ObservacionTipo>(initialType);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAlert = observacionTipo === "ALERTA";

  async function handleSave() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/clientes/${clientId}/observacion`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        observacion,
        observacionTipo,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar la observación.");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  return (
    <div
      className={`mt-5 rounded-2xl border p-4 ${
        isAlert ? "border-red-200 bg-red-50/80" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={`text-sm font-semibold ${
                isAlert ? "text-red-700" : "text-slate-800"
              }`}
            >
              Observación interna
            </p>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                isAlert
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {isAlert ? "PROBLEMÁTICO" : "NORMAL"}
            </span>
          </div>

          {!editing && (
            <p
              className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${
                isAlert ? "text-red-700" : "text-slate-700"
              }`}
            >
              {observacion.trim() || "Sin observaciones cargadas."}
            </p>
          )}
        </div>

        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
          >
            Editar
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-4 space-y-4">
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            rows={4}
            placeholder="Ej: Se atrasa seguido. Coordinar antes de pasar. Prefiere transferencia."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900"
          />

          <div>
            <p className="text-sm font-medium text-slate-700">
              Tipo de observación
            </p>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <ObservationTypeButton
                label="Comentario normal"
                active={observacionTipo === "NORMAL"}
                onClick={() => setObservacionTipo("NORMAL")}
              />

              <ObservationTypeButton
                label="Problemático"
                active={observacionTipo === "ALERTA"}
                danger
                onClick={() => setObservacionTipo("ALERTA")}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setObservacion(initialValue);
                setObservacionTipo(initialType);
                setEditing(false);
                setError("");
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleSave}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar observación"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ObservationTypeButton({
  label,
  active,
  danger,
  onClick,
}: {
  label: string;
  active: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? danger
            ? "bg-red-600 text-white shadow-sm"
            : "bg-slate-900 text-white shadow-sm"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
