"use client";

export default function ConfirmDialog({
  title,
  description,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-4 sm:py-6">
      <div className="mx-auto flex min-h-dvh w-full max-w-md items-start sm:items-center">
        <div className="my-auto max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:max-h-[calc(100dvh-3rem)]">
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                danger
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {loading ? "Procesando..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
