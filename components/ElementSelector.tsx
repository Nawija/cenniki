"use client";

import { useState, ReactNode, Fragment, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useSidebar } from "@/lib/SidebarContext";
import { X, Trash2, ArrowUp, MoveUp } from "lucide-react";

// Typ dla elementu separatora
interface SeparatorElement {
    type: "separator";
    label: string;
}

// Funkcja sprawdzająca czy element to separator
const isSeparator = (el: any): el is SeparatorElement => {
    return el && el.type === "separator";
};

// Funkcja do parsowania wymiarów z opisu (np. "102 x 100 h90" → { width: 102, depth: 100, height: 90 })
const parseDimensions = (
    description: string[] | string | undefined
): { width: number; depth: number; height: number } | null => {
    if (!description) return null;
    const text = Array.isArray(description) ? description[0] : description;
    if (!text) return null;

    // Wzorce: "102 x 100 h90", "102x100 h90", "102 x 100 x 90", "szer.102 gł.100 wys.90"
    // Pierwszy wymiar to zawsze szerokość, drugi głębokość, trzeci wysokość
    const numbers = text.match(/\d+/g);
    if (!numbers || numbers.length < 2) return null;

    return {
        width: parseInt(numbers[0]) || 0,
        depth: parseInt(numbers[1]) || 0,
        height: numbers[2] ? parseInt(numbers[2]) : 0,
    };
};

export default function ElementSelector({
    elements,
    groups,
    discount,
    priceFactor = 1,
    extraHeaders,
    renderExtraColumns,
}: {
    elements: Record<string, any>;
    groups: string[];
    discount?: number;
    priceFactor?: number;
    extraHeaders?: ReactNode;
    renderExtraColumns?: (elData: any) => ReactNode;
}) {
    const { width: sidebarWidth } = useSidebar();
    const [cart, setCart] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<string>("");
    const [isExpanded, setIsExpanded] = useState(false);

    const elementList = Object.values(elements);

    // Licznik ile razy każdy element jest w koszyku
    const cartCounts = cart.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

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

    // Cena po faktorze (bez rabatu) - ta będzie przekreślona
    const totalPriceWithFactor = Math.round(originalTotalPrice * priceFactor);

    // Cena końcowa (z faktorem i rabatem) - ta będzie wyświetlona jako promocyjna
    const totalPrice =
        discount && discount > 0
            ? Math.round(totalPriceWithFactor * (1 - discount / 100))
            : totalPriceWithFactor;

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
                                        className={`px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer transition-colors whitespace-nowrap ${
                                            selectedGroup === g
                                                ? "bg-blue-50 text-blue-800"
                                                : ""
                                        }`}
                                        onClick={() => setSelectedGroup(g)}
                                    >
                                        {g}
                                    </th>
                                ))}
                                {extraHeaders}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {elementList.map((elData, index) => {
                                // Sprawdź czy to separator
                                if (isSeparator(elData)) {
                                    return (
                                        <tr
                                            key={`separator-${index}`}
                                            className="bg-orange-50 border-y-2 border-orange-200"
                                        >
                                            <td
                                                colSpan={
                                                    groups.length +
                                                    1 +
                                                    (extraHeaders ? 1 : 0)
                                                }
                                                className="px-4 py-3 text-center text-sm font-bold text-orange-800 uppercase tracking-wide"
                                            >
                                                {elData.label}
                                            </td>
                                        </tr>
                                    );
                                }

                                const countInCart =
                                    cartCounts[elData.code] || 0;
                                return (
                                    <tr
                                        key={elData.code}
                                        onClick={() => addToCart(elData)}
                                        className={`cursor-pointer transition-colors hover:bg-blue-50 active:bg-blue-50 ${
                                            countInCart > 0
                                                ? "bg-blue-50/50"
                                                : ""
                                        }`}
                                    >
                                        <td
                                            className={`px-2 py-2 text-sm font-medium text-gray-900 sticky left-0 z-10 ${
                                                countInCart > 0 && selectedGroup
                                                    ? "bg-blue-50"
                                                    : "bg-white"
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {elData.image && (
                                                    <div className="relative w-6 h-6 flex-shrink-0">
                                                        <Image
                                                            src={elData.image}
                                                            alt=""
                                                            fill
                                                            className="object-contain"
                                                        />
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span>{elData.code}</span>
                                                    {elData.description && (
                                                        <span className="text-xs text-gray-500 font-normal mt-0.5">
                                                            {Array.isArray(
                                                                elData.description
                                                            )
                                                                ? elData.description.join(
                                                                      "; "
                                                                  )
                                                                : elData.description}
                                                        </span>
                                                    )}
                                                </div>
                                                {countInCart > 0 && (
                                                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-900 rounded-full">
                                                        {countInCart}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        {groups.map((g, groupIndex) => {
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
                                            const selectedGroupIndex =
                                                groups.indexOf(selectedGroup);
                                            const isBeforeSelected =
                                                selectedGroup &&
                                                groupIndex <=
                                                    selectedGroupIndex;
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
                                                                ? "text-red-800 bg-blue-50"
                                                                : "text-blue-800 bg-blue-50"
                                                            : isBeforeSelected &&
                                                              countInCart > 0
                                                            ? "bg-blue-50/50"
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
                                        {renderExtraColumns &&
                                            renderExtraColumns(elData)}
                                    </tr>
                                );
                            })}
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
                                <tr className=" border-b border-gray-200">
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Element
                                    </th>
                                    {groups.map((g) => (
                                        <th
                                            key={g}
                                            className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer transition-colors ${
                                                selectedGroup === g
                                                    ? "bg-blue-50 text-blue-800"
                                                    : ""
                                            }`}
                                            onClick={() => setSelectedGroup(g)}
                                        >
                                            {g}
                                        </th>
                                    ))}
                                    {extraHeaders}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {elementList.map((elData, index) => {
                                    // Sprawdź czy to separator
                                    if (isSeparator(elData)) {
                                        return (
                                            <tr
                                                key={`separator-${index}`}
                                                className="bg-gray-200/60 border-y-2 border-gray-300"
                                            >
                                                <td
                                                    colSpan={
                                                        groups.length +
                                                        1 +
                                                        (extraHeaders ? 1 : 0)
                                                    }
                                                    className="px-4 py-2 text-center text-sm font-bold text-gray-700 uppercase tracking-wide"
                                                >
                                                    {elData.label}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const countInCart =
                                        cartCounts[elData.code] || 0;
                                    return (
                                        <tr
                                            key={elData.code}
                                            onClick={() => addToCart(elData)}
                                            className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                                                countInCart > 0 &&
                                                !selectedGroup
                                                    ? "bg-blue-50"
                                                    : "odd:bg-gray-100/70"
                                            } z-10`}
                                        >
                                            <td
                                                className={`px-4 py-2.5 text-sm font-medium text-gray-900 ${
                                                    countInCart > 0 &&
                                                    selectedGroup
                                                        ? "bg-blue-50"
                                                        : ""
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {elData.image && (
                                                        <div className="relative w-12 h-12 flex-shrink-0">
                                                            <Image
                                                                src={
                                                                    elData.image
                                                                }
                                                                alt=""
                                                                fill
                                                                className="object-contain"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col">
                                                        <span>
                                                            {elData.code}
                                                        </span>
                                                        {elData.description && (
                                                            <span className="text-xs text-gray-500 font-normal mt-0.5">
                                                                {Array.isArray(
                                                                    elData.description
                                                                )
                                                                    ? elData.description.join(
                                                                          " • "
                                                                      )
                                                                    : elData.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {countInCart > 0 && (
                                                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-900 rounded-full">
                                                            {countInCart}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {groups.map((g, groupIndex) => {
                                                const rawPrice =
                                                    elData.prices?.[g];
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
                                                const selectedGroupIndex =
                                                    groups.indexOf(
                                                        selectedGroup
                                                    );
                                                const isBeforeSelected =
                                                    selectedGroup &&
                                                    groupIndex <=
                                                        selectedGroupIndex;
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
                                                                    ? "text-red-800 bg-blue-50"
                                                                    : "text-blue-800 bg-blue-50"
                                                                : isBeforeSelected &&
                                                                  countInCart >
                                                                      0
                                                                ? "bg-blue-50"
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
                                            {renderExtraColumns &&
                                                renderExtraColumns(elData)}
                                        </tr>
                                    );
                                })}
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
                                        <option value="">Wybierz Grupę</option>
                                        {groups.map((g) => (
                                            <option key={g} value={g}>
                                                {g}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Cena - kontener o stałej szerokości */}
                                    <div className="min-w-[80px] md:min-w-[120px] text-right">
                                        <AnimatePresence mode="wait">
                                            {selectedGroup &&
                                                totalPrice > 0 && (
                                                    <motion.div
                                                        key="price"
                                                        initial={{
                                                            opacity: 0,
                                                            y: 8,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            y: 0,
                                                        }}
                                                        exit={{
                                                            opacity: 0,
                                                            y: 8,
                                                        }}
                                                        transition={{
                                                            duration: 0.2,
                                                            ease: "easeOut",
                                                        }}
                                                    >
                                                        {discount &&
                                                        discount > 0 &&
                                                        totalPriceWithFactor !==
                                                            totalPrice ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs line-through text-gray-400">
                                                                    {totalPriceWithFactor.toLocaleString(
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
                                                    </motion.div>
                                                )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Wyczyść */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearCart();
                                        }}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                        title="Wyczyść"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* ROZWINIĘTE SZCZEGÓŁY - WIZUALIZACJA MEBLA */}
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
                                            {!selectedGroup ? (
                                                <p className="text-sm text-amber-600">
                                                    Wybierz grupę cenową, aby
                                                    zobaczyć ceny
                                                </p>
                                            ) : (
                                                <FurnitureVisualization
                                                    cart={cart}
                                                    selectedGroup={
                                                        selectedGroup
                                                    }
                                                    calculatePrice={
                                                        calculatePrice
                                                    }
                                                    calculatePriceWithFactor={
                                                        calculatePriceWithFactor
                                                    }
                                                    discount={discount}
                                                    removeOne={removeOne}
                                                />
                                            )}
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

// ============================================
// KOMPONENT WIZUALIZACJI MEBLA
// ============================================

function FurnitureVisualization({
    cart,
    selectedGroup,
    calculatePrice,
    calculatePriceWithFactor,
    discount,
    removeOne,
}: {
    cart: any[];
    selectedGroup: string;
    calculatePrice: (price: number) => number;
    calculatePriceWithFactor: (price: number) => number;
    discount?: number;
    removeOne: (index: number) => void;
}) {
    // Stan do śledzenia obróconych elementów (indeks → czy obrócony)
    const [flippedItems, setFlippedItems] = useState<Record<number, boolean>>(
        {}
    );

    const toggleFlip = (index: number) => {
        setFlippedItems((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    // Oblicz całkowitą szerokość
    const totalWidth = useMemo(() => {
        let width = 0;
        let foundCorner = false;

        for (const item of cart) {
            const dims = parseDimensions(item.data.description);
            if (dims) {
                if (foundCorner) {
                    // Po narożniku liczymy głębokość jako "szerokość" pionowej części
                    width += dims.depth;
                } else {
                    width += dims.width;
                }
            }
            if (item.data.isCorner) {
                foundCorner = true;
            }
        }
        return width;
    }, [cart]);

    // Znajdź indeks narożnika
    const cornerIndex = cart.findIndex((item) => item.data.isCorner);
    const hasCorner = cornerIndex !== -1;

    // Podziel elementy na poziome (przed i włącznie z narożnikiem) i pionowe (po narożniku)
    const horizontalItems = hasCorner ? cart.slice(0, cornerIndex + 1) : cart;
    const verticalItems = hasCorner ? cart.slice(cornerIndex + 1) : [];

    return (
        <div className="space-y-4">
            {/* Wizualizacja mebla */}
            <div className="flex items-end gap-4">
                <div className="flex flex-col items-start gap-0 overflow-visible relative pt-8">
                    <div className="flex flex-col items-center text-gray-400 pb-2 absolute bottom-0 left-1/2 -translate-x-1/2">
                        <MoveUp size={44} className="text-blue-400" />
                    </div>
                    {/* Górna/pozioma część */}
                    <div className="flex items-end overflow-visible">
                        {horizontalItems.map((item, i) => {
                            const rawPrice = item.data.prices?.[selectedGroup];
                            const finalPrice = rawPrice
                                ? calculatePrice(rawPrice)
                                : null;
                            const dims = parseDimensions(item.data.description);
                            const realIndex = cart.indexOf(item);
                            const isFlipped = flippedItems[realIndex] || false;

                            return (
                                <div
                                    key={realIndex}
                                    className="relative group"
                                    style={{
                                        marginLeft: i > 0 ? "-1px" : 0,
                                    }}
                                >
                                    {/* Obrazek elementu - kliknięcie obraca */}
                                    <div
                                        onClick={() => toggleFlip(realIndex)}
                                        className={`relative bg-gray-100 border-2 overflow-hidden transition-all cursor-pointer hover:border-blue-300 ${
                                            item.data.isCorner
                                                ? "border-blue-400 rounded-tr-lg"
                                                : "border-gray-300"
                                        }`}
                                        style={{
                                            width: item.data.image ? 60 : 50,
                                            height: item.data.image ? 60 : 50,
                                        }}
                                        title="Kliknij aby obrócić"
                                    >
                                        {item.data.image ? (
                                            <Image
                                                src={item.data.image}
                                                alt={item.name}
                                                fill
                                                className={`object-contain transition-transform duration-200 ${
                                                    isFlipped
                                                        ? "scale-x-[-1]"
                                                        : ""
                                                }`}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-medium">
                                                {item.name}
                                            </div>
                                        )}

                                        {/* Przycisk usuwania */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeOne(realIndex);
                                            }}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>

                                    {/* Tooltip z ceną i wymiarami - na górze */}
                                    <div
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded invisible group-hover:visible whitespace-nowrap shadow-lg"
                                        style={{ zIndex: 9999 }}
                                    >
                                        <div className="font-medium">
                                            {item.name}
                                        </div>
                                        {dims && (
                                            <div className="text-gray-300">
                                                {dims.width} × {dims.depth} cm
                                            </div>
                                        )}
                                        {finalPrice && (
                                            <div className="text-green-400">
                                                {finalPrice.toLocaleString(
                                                    "pl-PL"
                                                )}{" "}
                                                zł
                                            </div>
                                        )}
                                        <div className="text-gray-400 text-[10px]">
                                            Kliknij aby obrócić
                                        </div>
                                        {/* Strzałka tooltipa */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pionowa część (po narożniku) */}
                    {verticalItems.length > 0 && (
                        <div
                            className="flex flex-col"
                            style={{
                                marginLeft: (horizontalItems.length - 1) * 59,
                            }}
                        >
                            {verticalItems.map((item, i) => {
                                const rawPrice =
                                    item.data.prices?.[selectedGroup];
                                const finalPrice = rawPrice
                                    ? calculatePrice(rawPrice)
                                    : null;
                                const dims = parseDimensions(
                                    item.data.description
                                );
                                const realIndex = cart.indexOf(item);
                                const isFlipped =
                                    flippedItems[realIndex] || false;

                                return (
                                    <div
                                        key={realIndex}
                                        className="relative group"
                                        style={{
                                            marginTop:
                                                i === 0 ? "-1px" : "-1px",
                                        }}
                                    >
                                        <div
                                            onClick={() =>
                                                toggleFlip(realIndex)
                                            }
                                            className="relative bg-gray-100 border-2 border-gray-300 overflow-hidden cursor-pointer hover:border-blue-300 transition-all"
                                            style={{
                                                width: item.data.image
                                                    ? 60
                                                    : 50,
                                                height: item.data.image
                                                    ? 60
                                                    : 50,
                                            }}
                                            title="Kliknij aby obrócić"
                                        >
                                            {item.data.image ? (
                                                <Image
                                                    src={item.data.image}
                                                    alt={item.name}
                                                    fill
                                                    className={`object-contain transition-transform duration-200 rotate-90 ${
                                                        isFlipped
                                                            ? "scale-x-[-1]"
                                                            : ""
                                                    }`}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-medium">
                                                    {item.name}
                                                </div>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeOne(realIndex);
                                                }}
                                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>

                                        {/* Tooltip - z prawej strony */}
                                        <div
                                            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-900 text-white text-xs px-2 py-1 rounded invisible group-hover:visible whitespace-nowrap shadow-lg"
                                            style={{ zIndex: 9999 }}
                                        >
                                            <div className="font-medium">
                                                {item.name}
                                            </div>
                                            {dims && (
                                                <div className="text-gray-300">
                                                    {dims.width} × {dims.depth}{" "}
                                                    cm
                                                </div>
                                            )}
                                            {finalPrice && (
                                                <div className="text-green-400">
                                                    {finalPrice.toLocaleString(
                                                        "pl-PL"
                                                    )}{" "}
                                                    zł
                                                </div>
                                            )}
                                            <div className="text-gray-400 text-[10px]">
                                                Kliknij aby obrócić
                                            </div>
                                            {/* Strzałka tooltipa */}
                                            <div className="absolute top-1/2 right-full -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Podsumowanie wymiarów */}
            {totalWidth > 0 && (
                <div className="flex items-center gap-4 text-sm border-t pt-3">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                            Całkowita szerokość:
                        </span>
                        <span className="font-bold text-gray-900">
                            {totalWidth} cm
                        </span>
                    </div>
                    {hasCorner && (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500">Kształt:</span>
                            <span className="font-medium text-blue-600">
                                L (narożnik)
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Lista elementów z cenami */}
            <div className="flex flex-wrap gap-2 border-t pt-3">
                {cart.map((item, i) => {
                    const rawPrice = item.data.prices?.[selectedGroup];
                    const priceWithFactor = rawPrice
                        ? calculatePriceWithFactor(rawPrice)
                        : null;
                    const finalPrice = rawPrice
                        ? calculatePrice(rawPrice)
                        : null;
                    const hasDiscount =
                        discount &&
                        discount > 0 &&
                        priceWithFactor !== finalPrice;
                    const dims = parseDimensions(item.data.description);

                    return (
                        <div
                            key={i}
                            className={`inline-flex items-center gap-2 bg-white border rounded-lg px-2 py-1 text-sm ${
                                hasDiscount
                                    ? "border-red-200"
                                    : "border-gray-200"
                            } ${
                                item.data.isCorner ? "ring-2 ring-blue-200" : ""
                            }`}
                        >
                            {item.data.image && (
                                <div className="relative w-6 h-6 flex-shrink-0">
                                    <Image
                                        src={item.data.image}
                                        alt=""
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-800">
                                    {item.name}
                                </span>
                                {dims && (
                                    <span className="text-[10px] text-gray-400">
                                        {dims.width}×{dims.depth} cm
                                    </span>
                                )}
                            </div>
                            {hasDiscount ? (
                                <span className="flex flex-col items-end">
                                    <span className="text-[10px] line-through text-gray-400">
                                        {priceWithFactor?.toLocaleString(
                                            "pl-PL"
                                        )}
                                    </span>
                                    <span className="font-semibold text-red-600">
                                        {finalPrice?.toLocaleString("pl-PL")} zł
                                    </span>
                                </span>
                            ) : (
                                <span className="text-gray-500 font-medium">
                                    {priceWithFactor?.toLocaleString("pl-PL")}{" "}
                                    zł
                                </span>
                            )}
                            <button
                                onClick={() => removeOne(i)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
