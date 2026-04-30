"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ label = "← Volver" }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="text-sm font-medium text-slate-500 hover:text-slate-900"
    >
      {label}
    </button>
  );
}
