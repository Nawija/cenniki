"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "@/lib/SidebarContext";
import { X, Trash2 } from "lucide-react";

export default function ElementSelector({
    elements,
    groups,
    discount,
    priceFactor = 1,
}: {
    elements: Record<string, any>;
    groups: string[];
    discount?: number;
    priceFactor?: number;
}) {
    const { width: sidebarWidth } = useSidebar();
    const [cart, setCart] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    const [isExpanded, setIsExpanded] = useState(false);

    const elementList = Object.values(elements);

    const calculatePrice = (price: number) => {
        // Najpierw zastosuj priceFactor
        let finalPrice = Math.round(price * priceFactor);
        // Potem zastosuj rabat
        if (discount && discount > 0) {
            finalPrice = Math.round(finalPrice * (1 - discount / 100));
        }
        return finalPrice;
    };

    const calculatePriceWithFactor = (price: number) => {
        return Math.round(price * priceFactor);
    };

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

    const originalTotalPrice =
        selectedGroup && cart.length > 0
            ? cart.reduce(
                  (sum, item) => sum + (item.data.prices?.[selectedGroup] || 0),
                  0
              )
            : 0;

    const totalPriceWithFactor = calculatePriceWithFactor(originalTotalPrice);
    const totalPrice = calculatePrice(originalTotalPrice);

    return (
        <>
            {/* MOBILE: Table view with scroll */}
            <div className="md:hidden mb-6 w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw]">
                <div className="overflow-x-auto px-4">
                    <table className="w-full min-w-max">
                        <thead>
                            <tr className="bg-gray-50 border-y border-gray-200">
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50 z-10">
                                    Element
                                </th>
                                {groups.map((g) => (
                                    <th
                                        key={g}
                                        className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer transition-colors whitespace-nowrap"
                                        onClick={() => setSelectedGroup(g)}
                                    >
                                        {g}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {elementList.map((elData) => (
                                <tr
                                    key={elData.code}
                                    onClick={() => addToCart(elData)}
                                    className="cursor-pointer transition-colors hover:bg-blue-50 active:bg-blue-50"
                                >
                                    <td className="px-4 py-2 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                        {elData.code}
                                    </td>
                                    {groups.map((g) => {
                                        const rawPrice = elData.prices?.[g];
                                        const priceWithFactor = rawPrice
                                            ? Math.round(rawPrice * priceFactor)
                                            : null;
                                        const finalPrice =
                                            rawPrice && discount && discount > 0
                                                ? Math.round(
                                                      rawPrice *
                                                          priceFactor *
                                                          (1 - discount / 100)
                                                  )
                                                : priceWithFactor;
                                        const isSelected = selectedGroup === g;
                                        const hasDiscount =
                                            discount &&
                                            discount > 0 &&
                                            rawPrice;

                                        return (
                                            <td
                                                key={g}
                                                className={`px-3 py-2 text-center text-sm transition-colors whitespace-nowrap ${
                                                    isSelected
                                                        ? hasDiscount
                                                            ? "text-red-800 bg-red-50"
                                                            : "text-amber-800"
                                                        : "text-gray-600"
                                                }`}
                                            >
                                                {hasDiscount ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs line-through text-gray-400">
                                                            {priceWithFactor?.toLocaleString(
                                                                "pl-PL"
                                                            )}{" "}
                                                            zł
                                                        </span>
                                                        <span className="font-bold text-red-600">
                                                            {finalPrice?.toLocaleString(
                                                                "pl-PL"
                                                            )}{" "}
                                                            zł
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="font-semibold">
                                                        {priceWithFactor
                                                            ? `${priceWithFactor.toLocaleString(
                                                                  "pl-PL"
                                                              )} zł`
                                                            : "-"}
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

            {/* DESKTOP: Table view */}
            <div className="hidden md:block mb-6">
                <div
                    className={`bg-white border rounded-xl overflow-hidden border-gray-200`}
                >
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
                                            className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer transition-colors `}
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
                                        className="cursor-pointer transition-colors hover:bg-red-900/5 z-10"
                                    >
                                        <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                                            {elData.code}
                                        </td>
                                        {groups.map((g) => {
                                            const rawPrice = elData.prices?.[g];
                                            const priceWithFactor = rawPrice
                                                ? Math.round(
                                                      rawPrice * priceFactor
                                                  )
                                                : null;
                                            const finalPrice =
                                                rawPrice &&
                                                discount &&
                                                discount > 0
                                                    ? Math.round(
                                                          rawPrice *
                                                              priceFactor *
                                                              (1 -
                                                                  discount /
                                                                      100)
                                                      )
                                                    : priceWithFactor;
                                            const isSelected =
                                                selectedGroup === g;
                                            const hasDiscount =
                                                discount &&
                                                discount > 0 &&
                                                rawPrice;

                                            return (
                                                <td
                                                    key={g}
                                                    className={`px-2 py-2.5 text-center text-sm transition-colors ${
                                                        isSelected
                                                            ? hasDiscount
                                                                ? "text-red-800 bg-red-50"
                                                                : "text-amber-800"
                                                            : "text-gray-600"
                                                    }`}
                                                >
                                                    {hasDiscount ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs line-through text-gray-400">
                                                                {priceWithFactor?.toLocaleString(
                                                                    "pl-PL"
                                                                )}{" "}
                                                                zł
                                                            </span>
                                                            <span className="font-bold text-red-600">
                                                                {finalPrice?.toLocaleString(
                                                                    "pl-PL"
                                                                )}{" "}
                                                                zł
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-semibold">
                                                            {priceWithFactor
                                                                ? `${priceWithFactor.toLocaleString(
                                                                      "pl-PL"
                                                                  )} zł`
                                                                : "-"}
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
                                className="px-3 md:px-4 py-2 md:py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 text-sm md:text-base">
                                            {cart.length}{" "}
                                            <span className="hidden sm:inline">
                                                {cart.length === 1
                                                    ? "element"
                                                    : "elementów"}
                                            </span>
                                        </span>
                                    </div>

                                    {/* Miniaturki wybranych - tylko desktop */}
                                    <div className="hidden lg:flex items-center gap-1 text-sm text-gray-500">
                                        <span className="max-w-[200px] truncate">
                                            {cart
                                                .map((c) => c.name)
                                                .join(" + ")}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 md:gap-4">
                                    {/* Grupa cenowa - mini select */}
                                    <select
                                        value={selectedGroup}
                                        onChange={(e) =>
                                            setSelectedGroup(e.target.value)
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs md:text-sm bg-gray-100 border-0 rounded-lg px-2 py-1 md:py-1.5 font-medium text-gray-700 focus:ring-2 focus:ring-blue-500"
                                    >
                                        {groups.map((g) => (
                                            <option key={g} value={g}>
                                                {g}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Cena */}
                                    <div className="text-right min-w-[80px] md:min-w-[120px]">
                                        {discount &&
                                        discount > 0 &&
                                        originalTotalPrice !== totalPrice ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs line-through text-gray-400">
                                                    {originalTotalPrice.toLocaleString(
                                                        "pl-PL"
                                                    )}{" "}
                                                    zł
                                                </span>
                                                <span className="text-base md:text-lg font-bold text-red-600">
                                                    {totalPrice.toLocaleString(
                                                        "pl-PL"
                                                    )}{" "}
                                                    zł
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-base md:text-lg font-bold text-gray-900">
                                                {totalPrice.toLocaleString(
                                                    "pl-PL"
                                                )}{" "}
                                                zł
                                            </span>
                                        )}
                                    </div>

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
                                                {cart.map((item, i) => {
                                                    const rawPrice =
                                                        item.data.prices?.[
                                                            selectedGroup
                                                        ];
                                                    const priceWithFactor =
                                                        rawPrice
                                                            ? calculatePriceWithFactor(
                                                                  rawPrice
                                                              )
                                                            : null;
                                                    const finalPrice = rawPrice
                                                        ? calculatePrice(
                                                              rawPrice
                                                          )
                                                        : null;
                                                    const hasDiscount =
                                                        discount &&
                                                        discount > 0 &&
                                                        priceWithFactor !==
                                                            finalPrice;

                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`inline-flex items-center gap-2 bg-white border rounded-full pl-3 pr-1.5 py-1 text-sm ${
                                                                hasDiscount
                                                                    ? "border-red-200"
                                                                    : "border-gray-200"
                                                            }`}
                                                        >
                                                            <span className="font-medium text-gray-800">
                                                                {item.name}
                                                            </span>
                                                            {hasDiscount ? (
                                                                <span className="flex items-center gap-1">
                                                                    <span className="text-xs line-through text-gray-400">
                                                                        {priceWithFactor?.toLocaleString(
                                                                            "pl-PL"
                                                                        )}
                                                                    </span>
                                                                    <span className="font-semibold text-red-600">
                                                                        {finalPrice?.toLocaleString(
                                                                            "pl-PL"
                                                                        )}{" "}
                                                                        zł
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500">
                                                                    {priceWithFactor?.toLocaleString(
                                                                        "pl-PL"
                                                                    )}{" "}
                                                                    zł
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() =>
                                                                    removeOne(i)
                                                                }
                                                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
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
