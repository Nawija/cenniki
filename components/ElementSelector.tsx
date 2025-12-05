"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/lib/SidebarContext";
import { X, Trash2, ShoppingCart } from "lucide-react";

export default function ElementSelector({
    elements,
    groups,
}: {
    elements: Record<string, any>;
    groups: string[];
}) {
    const { width: sidebarWidth } = useSidebar();
    const [cart, setCart] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    const [isExpanded, setIsExpanded] = useState(false);

    const elementList = Object.values(elements);

    const addToCart = (elData: any) => {
        setCart((prev) => [...prev, { name: elData.code, data: elData }]);
    };

    const clearCart = () => {
        setCart([]);
        setIsExpanded(false);
    };

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
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Element
                                    </th>
                                    {groups.map((g) => (
                                        <th
                                            key={g}
                                            className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer transition-colors ${
                                                selectedGroup === g
                                                    ? "text-amber-800 bg-amber-50 border-b-2 border-amber-600"
                                                    : "text-gray-500 hover:text-gray-700"
                                            }`}
                                            onClick={() => setSelectedGroup(g)}
                                        >
                                            {g}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {elementList.map((elData) => (
                                    <tr
                                        key={elData.code}
                                        onClick={() => addToCart(elData)}
                                        className="cursor-pointer transition-colors hover:bg-blue-50 z-10"
                                    >
                                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                                            {elData.code}
                                        </td>
                                        {groups.map((g) => {
                                            const price = elData.prices?.[g];
                                            const isSelected =
                                                selectedGroup === g;
                                            return (
                                                <td
                                                    key={g}
                                                    className={`px-2 py-2.5 text-center text-sm transition-colors font-semibold ${
                                                        isSelected
                                                            ? " text-amber-800"
                                                            : "text-gray-600"
                                                    }`}
                                                >
                                                    {price
                                                        ? `${price.toLocaleString(
                                                              "pl-PL"
                                                          )} zł`
                                                        : "-"}
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

            {/* PANEL KOSZYKA - KOMPAKTOWY */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{
                            type: "spring",
                            damping: 25,
                            stiffness: 200,
                        }}
                        style={{
                            width: `calc(100% - ${sidebarWidth}px)`,
                            marginLeft: sidebarWidth,
                        }}
                        className="fixed bottom-0 left-0 z-50 max-md:!w-full max-md:!ml-0"
                    >
                        <div className="bg-white border-t border-gray-200 shadow-lg">
                            {/* NAGŁÓWEK - ZAWSZE WIDOCZNY */}
                            <div
                                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">
                                            {cart.length}{" "}
                                            {cart.length === 1
                                                ? "element"
                                                : "elementów"}
                                        </span>
                                    </div>

                                    {/* Miniaturki wybranych na mobile */}
                                    <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500">
                                        <span className="max-w-[200px] truncate">
                                            {cart
                                                .map((c) => c.name)
                                                .join(" + ")}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Grupa cenowa - mini select */}
                                    <select
                                        value={selectedGroup}
                                        onChange={(e) =>
                                            setSelectedGroup(e.target.value)
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-sm bg-gray-100 border-0 rounded-lg px-2 py-1.5 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
                                    >
                                        {groups.map((g) => (
                                            <option key={g} value={g}>
                                                {g}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Cena */}
                                    <span className="text-lg font-bold text-gray-900 min-w-[100px] text-right">
                                        {totalPrice.toLocaleString("pl-PL")} zł
                                    </span>

                                    {/* Wyczyść */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearCart();
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                        title="Wyczyść"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* ROZWINIĘTE SZCZEGÓŁY */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden border-t border-gray-100"
                                    >
                                        <div className="px-4 py-3 bg-gray-50">
                                            <div className="flex flex-wrap gap-2">
                                                {cart.map((item, i) => (
                                                    <div
                                                        key={i}
                                                        className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-3 pr-1.5 py-1 text-sm"
                                                    >
                                                        <span className="font-medium text-gray-800">
                                                            {item.name}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            {item.data.prices?.[
                                                                selectedGroup
                                                            ]?.toLocaleString(
                                                                "pl-PL"
                                                            )}{" "}
                                                            zł
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                removeOne(i)
                                                            }
                                                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
