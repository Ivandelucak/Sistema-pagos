"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangeUserPasswordButton({
  userId,
  disabled,
}: {
  userId: number;
  disabled?: boolean;
}) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function closeModal() {
    if (loading) return;

    setOpen(false);
    setPassword("");
    setConfirmPassword("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/usuarios/${userId}/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "No se pudo cambiar la contraseña.");
      return;
    }

    closeModal();
    router.refresh();
  }

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400"
      >
        Contraseña bloqueada
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
      >
        Cambiar contraseña
      </button>

      {open && (
        <div className="fixed inset-0 z-9999 grid min-h-screen place-items-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-xl font-semibold text-slate-950">
                Cambiar contraseña
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Definí una nueva contraseña provisoria para este usuario.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Nueva contraseña
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Repetir contraseña
                </label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition-colors focus:border-slate-900"
                  placeholder="Repetí la contraseña"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

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
                  {loading ? "Guardando..." : "Guardar contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
