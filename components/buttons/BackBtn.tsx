"use client";

import { useRouter } from "next/navigation";
import React from "react";

export default function BackBtn() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="mb-4 px-4 py-1 bg-gray-200 hover:bg-gray-300 transition-colors cursor-pointer rounded-lg font-semibold flex items-center gap-2"
    >
      ← Powrót
    </button>
  );
}
