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

    // Zamieniamy entries -> values
    const elementList = Object.values(elements);

    const addToCart = (elData: any) => {
        const elName = elData.code; // <-- NAZWA = CODE
        setCart((prev) => [...prev, { name: elName, data: elData }]);
    };

    const clearCart = () => setCart([]);

    const removeOne = (index: number) => {
        setCart((prev) => prev.filter((_, i) => i !== index));
    };

    const totalPrice =
        selectedGroup && cart.length > 0
            ? cart.reduce(
                  (sum, item) => sum + (item.data.prices?.[selectedGroup] || 0),
                  0
              )
            : 0;

    return (
        <>
            {/* TABELA */}
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
                                {elementList.map((elData, idx) => (
                                    <tr
                                        key={elData.code}
                                        onClick={() => addToCart(elData)}
                                        className={`cursor-pointer border-b border-zinc-200 transition-colors hover:bg-blue-100 ${
                                            idx % 2 === 0
                                                ? "bg-white"
                                                : "bg-gray-50"
                                        }`}
                                    >
                                        {/* NAZWA = code */}
                                        <td className="px-4 py-3 font-semibold text-gray-900">
                                            {elData.code}
                                        </td>

                                        {groups.map((g) => {
                                            const price = elData.prices?.[g];

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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PANEL KOSZYKA */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div
                        initial={{ y: 220, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 220, opacity: 0 }}
                        transition={{
                            type: "spring",
                            damping: 22,
                            stiffness: 180,
                        }}
                        className="fixed bottom-0 left-0 w-full md:w-[calc(100%-260px)] md:ml-[260px] z-50"
                    >
                        <div className="bg-white border-t border-zinc-300">
                            <div className="max-w-7xl mx-auto px-3 py-4 flex flex-col gap-8">
                                {/* HEADER */}
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Wybrane elementy
                                    </h3>

                                    <button
                                        onClick={clearCart}
                                        className="text-sm px-3 py-1.5 cursor-pointer bg-red-700 hover:bg-red-800 text-white rounded-sm font-medium transition"
                                    >
                                        Wyczyść
                                    </button>
                                </div>

                                {/* LISTA ELEMENTÓW */}
                                <div className="flex flex-wrap gap-4">
                                    {cart.map((item, i) => (
                                        <motion.div
                                            key={i}
                                            layout
                                            className="flex items-center gap-3 px-1"
                                        >
                                            {/* PLUS IKONKA MIĘDZY ELEMENTAMI */}
                                            {i > 0 && (
                                                <span className="text-gray-400 font-bold text-xl -ml-2 select-none">
                                                    +
                                                </span>
                                            )}

                                            <div className="flex flex-col">
                                                <span className="font-semibold text-gray-900 text-base">
                                                    {item.name}
                                                </span>

                                                {item.data.description && (
                                                    <span className="text-xs text-gray-600 leading-tight">
                                                        {item.data.description.join(
                                                            " + "
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            {/* <button
                                                onClick={() => removeOne(i)}
                                                className="ml-1 text-red-600 hover:text-red-800 transition font-bold text-lg"
                                            >
                                                ×
                                            </button> */}
                                        </motion.div>
                                    ))}
                                </div>

                                {/* GRUPY CENOWE */}
                                <div>
                                    <h4 className="mb-2 text-sm font-semibold text-gray-700">
                                        Wybierz grupę cenową
                                    </h4>

                                    <div className="flex flex-wrap gap-2">
                                        {groups.map((g) => (
                                            <label
                                                key={g}
                                                className={`px-3 py-1.5 text-sm rounded-lg border cursor-pointer transition font-medium
                                        ${
                                            selectedGroup === g
                                                ? "bg-blue-100 text-blue-900 border-blue-300 shadow-sm"
                                                : "bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200"
                                        }
                                    `}
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

                                {/* PODSUMOWANIE */}

                                <div className="flex mr-auto w-full flex-col items-end">
                                    <span className="text-sm font-medium text-gray-600">
                                        Razem:
                                    </span>

                                    <span className="text-4xl font-extrabold tracking-tight text-gray-900">
                                        {selectedGroup
                                            ? `${totalPrice.toLocaleString(
                                                  "pl-PL"
                                              )} zł`
                                            : "-"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
