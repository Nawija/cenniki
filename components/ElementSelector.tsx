"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ElementSelector({
    elements,
    groups,
}: {
    elements: Record<string, any>;
    groups: string[];
}) {
    const [cart, setCart] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>("");

    // Dodawanie elementu do koszyka
    const addToCart = (elName: string, elData: any) => {
        setCart((prev) => [...prev, { name: elName, data: elData }]);
    };

    const clearCart = () => setCart([]);

    const removeOne = (index: number) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

    // Sumowanie
    const totalPrice =
        selectedGroup && cart.length > 0
            ? cart.reduce(
                  (sum, item) =>
                      sum + (item.data.prices?.[selectedGroup] || 0),
                  0
              )
            : 0;

    return (
        <>
            {/* TABELA ELEMENTÓW */}
            <div className="mb-6">
                <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-zinc-100 border-b border-zinc-200">
                                    <th className="px-4 py-3 text-left font-semibold text-sm text-gray-900 min-w-[200px]">
                                        Element
                                    </th>
                                    {groups.map((g) => (
                                        <th
                                            key={g}
                                            className="px-3 py-3 text-center font-semibold text-sm text-gray-900 whitespace-nowrap"
                                        >
                                            {g}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {Object.entries(elements).map(
                                    ([elName, elData], idx) => (
                                        <tr
                                            key={elName}
                                            onClick={() =>
                                                addToCart(elName, elData)
                                            }
                                            className={`cursor-pointer border-b border-zinc-200 transition-colors hover:bg-blue-100 ${
                                                idx % 2 === 0
                                                    ? "bg-white"
                                                    : "bg-gray-50"
                                            }`}
                                        >
                                            <td className="px-4 py-3 font-semibold text-gray-900">
                                                {elName}
                                            </td>

                                            {groups.map((g) => {
                                                const price =
                                                    elData.prices?.[g];

                                                return (
                                                    <td
                                                        key={g}
                                                        className="px-3 py-3 text-center text-sm font-medium text-gray-800"
                                                    >
                                                        {price ? (
                                                            <span className="inline-flex items-center justify-center min-w-[80px] px-2 py-1 text-gray-900 rounded-lg font-semibold">
                                                                {price.toLocaleString(
                                                                    "pl-PL"
                                                                )}{" "}
                                                                zł
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">
                                                                -
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PANEL FIXED – KOSZYK */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div
                        initial={{ y: 200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 200, opacity: 0 }}
                        transition={{ type: "spring", damping: 20 }}
                        className="fixed bottom-0 left-0 w-full md:w-[calc(100%-260px)] md:ml-[260px] bg-white border-t border-gray-300 p-6 z-50"
                    >
                        <div className="flex justify-between items-start gap-6">
                            {/* LEWA STRONA — Lista elementów */}
                            <div className="flex-1">

                                <div className="flex items-center justify-start gap-2">
                                    {cart.map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex justify-between items-center p-1 group"
                                        >
                                            <div>
                                                <div className="font-semibold">
                                                    {item.name}
                                                </div>
                                                {item.data.description && (
                                                    <div className="text-xs text-gray-600">
                                                        {item.data.description.join(
                                                            " + "
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => removeOne(i)}
                                                className="text-red-600 font-bold text-lg px-2 group-hover:opacity-100 opacity-0 transition-opacity cursor-pointer"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Grupa cenowa */}
                                <div className="mt-6">
                                    <div className="flex flex-wrap gap-2">
                                        {groups.map((g) => (
                                            <label
                                                key={g}
                                                className={`px-2 py-1 border rounded-lg text-sm cursor-pointer font-semibold transition ${
                                                    selectedGroup === g
                                                        ? "bg-amber-100 text-amber-800 border-amber-200"
                                                        : "bg-gray-100 border-gray-200"
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="group"
                                                    value={g}
                                                    className="hidden"
                                                    onChange={() =>
                                                        setSelectedGroup(g)
                                                    }
                                                />
                                                {g}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Wyczysc koszyk */}
                                <button
                                    onClick={clearCart}
                                    className="mt-6 px-2 text-sm font-semibold py-1 bg-red-200 text-red-800 rounded-lg hover:bg-red-300"
                                >
                                    Wyczyść koszyk
                                </button>
                            </div>

                            {/* PRAWA STRONA — SUMA */}
                            <div className="text-right">
                                <div className="text-lg font-semibold text-gray-700">
                                    Razem:
                                </div>
                                <div className="text-4xl font-bold text-gray-800 mt-1">
                                    {selectedGroup
                                        ? `${totalPrice.toLocaleString(
                                              "pl-PL"
                                          )} zł`
                                        : "—"}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
