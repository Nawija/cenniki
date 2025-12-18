"use client";

import React, {
    useState,
    useRef,
    useCallback,
    useEffect,
    useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
    X,
    Move,
    RotateCw,
    FlipHorizontal,
    Magnet,
    Link,
    ArrowLeftRight,
    ArrowUpDown,
    CornerDownRight,
} from "lucide-react";

// ============================================
// TYPY
// ============================================

interface Dimensions {
    width: number;
    depth: number;
    height: number;
}

interface Position {
    x: number;
    y: number;
}

interface FurnitureItem {
    id: string;
    name: string;
    data: any;
    position: Position;
    rotation: number;
    flipped: boolean;
    locked: boolean;
    snappedTo: string | null;
    snapSide: "left" | "right" | "top" | "bottom" | null;
    cartIndex: number; // Kolejność dodania do koszyka
}

interface SnapConnection {
    itemId: string;
    targetId: string;
    side: "left" | "right" | "top" | "bottom";
}

interface SnapZone {
    x: number;
    y: number;
    width: number;
    height: number;
    side: "left" | "right" | "top" | "bottom";
    targetId: string;
    isCornerSnap?: boolean;
}

interface FurnitureVisualizerProps {
    cart: any[];
    selectedGroup: string;
    calculatePrice: (price: number) => number;
    calculatePriceWithFactor: (price: number) => number;
    discount?: number;
    removeOne: (index: number) => void;
}

// ============================================
// STAŁE
// ============================================

const SNAP_THRESHOLD = 15; // px - dystans przyciągania
const SNAP_ZONE_SIZE = 25; // px - rozmiar widocznej strefy snap
const GRID_SIZE = 10;
const ELEMENT_SIZE = 60;

// ============================================
// FUNKCJE POMOCNICZE
// ============================================

const parseDimensions = (
    description: string[] | string | undefined
): Dimensions | null => {
    if (!description) return null;
    const text = Array.isArray(description) ? description[0] : description;
    if (!text) return null;

    const numbers = text.match(/\d+/g);
    if (!numbers || numbers.length < 2) return null;

    return {
        width: parseInt(numbers[0]) || 0,
        depth: parseInt(numbers[1]) || 0,
        height: numbers[2] ? parseInt(numbers[2]) : 0,
    };
};

// Oblicz efektywne wymiary elementu z uwzględnieniem rotacji
const getEffectiveDimensions = (
    dims: Dimensions,
    rotation: number
): { width: number; depth: number; height: number } => {
    const isRotated90 = Math.abs(rotation) === 90;
    return {
        width: isRotated90 ? dims.depth : dims.width,
        depth: isRotated90 ? dims.width : dims.depth,
        height: dims.height,
    };
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function FurnitureVisualizer({
    cart,
    selectedGroup,
    calculatePrice,
    calculatePriceWithFactor,
    discount,
    removeOne,
}: FurnitureVisualizerProps) {
    // Klucz localStorage oparty na zawartości koszyka (nazwy elementów)
    const storageKey = useMemo(() => {
        const cartSignature = cart.map((c) => c.name).join("|");
        return `furniture-visualizer-${btoa(
            encodeURIComponent(cartSignature)
        ).slice(0, 20)}`;
    }, [cart]);

    // Inicjalizacja z localStorage
    const [items, setItems] = useState<FurnitureItem[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Sprawdź czy zapisane elementy pasują do koszyka
                if (parsed.items && parsed.items.length === cart.length) {
                    return parsed.items;
                }
            }
        } catch (e) {}
        return [];
    });

    const [connections, setConnections] = useState<SnapConnection[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (
                    parsed.connections &&
                    parsed.items?.length === cart.length
                ) {
                    return parsed.connections;
                }
            }
        } catch (e) {}
        return [];
    });

    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
    const [activeSnapZone, setActiveSnapZone] = useState<SnapZone | null>(null);
    const [hasDragged, setHasDragged] = useState(false);

    const zoom = 1; // stały zoom
    const snapEnabled = true; // zawsze włączone
    const showDimensions = true; // zawsze włączone

    const canvasRef = useRef<HTMLDivElement>(null);
    const prevCartLengthRef = useRef(cart.length);

    // Zapisuj stan do localStorage przy każdej zmianie
    useEffect(() => {
        if (items.length > 0) {
            try {
                localStorage.setItem(
                    storageKey,
                    JSON.stringify({ items, connections })
                );
            } catch (e) {}
        }
    }, [items, connections, storageKey]);

    // Inicjalizacja elementów z AUTO-ŁĄCZENIEM w kolejności dodawania
    useEffect(() => {
        const prevLength = prevCartLengthRef.current;
        const currentLength = cart.length;

        // Jeśli już mamy wszystkie elementy z localStorage - nie rób nic
        if (items.length === currentLength && prevLength === currentLength) {
            return;
        }

        // Jeśli koszyk się zmniejszył (usunięto element) - nie rób nic z auto-łączeniem
        if (currentLength < prevLength) {
            prevCartLengthRef.current = currentLength;
            return;
        }

        // Jeśli koszyk jest pusty
        if (currentLength === 0) {
            setItems([]);
            setConnections([]);
            prevCartLengthRef.current = 0;
            localStorage.removeItem(storageKey);
            return;
        }

        // Jeśli items już ma wszystkie elementy (załadowane z localStorage) - nie inicjalizuj ponownie
        if (items.length === currentLength) {
            prevCartLengthRef.current = currentLength;
            return;
        }

        // Mapa istniejących elementów
        const existingItemsMap = new Map(
            items.map((item) => [item.cartIndex, item])
        );

        const newItems: FurnitureItem[] = [];
        const newConnections: SnapConnection[] = [...connections];

        // Śledź kierunek układania (po narożniku zmienia się na pionowy)
        let layoutDirection: "horizontal" | "vertical" = "horizontal";
        // Startuj od lewej strony planszy (działa lepiej na telefonach)
        let currentX = 30;
        let currentY = 60;

        cart.forEach((cartItem, index) => {
            const existingItem = existingItemsMap.get(index);

            if (existingItem) {
                // Element już istnieje - zachowaj jego pozycję
                newItems.push(existingItem);

                // Sprawdź czy to narożnik - zmień kierunek dla następnych
                if (existingItem.data.isCorner) {
                    layoutDirection = "vertical";
                }

                // Aktualizuj pozycję startową dla następnego elementu
                const dims = parseDimensions(existingItem.data.description);
                if (dims) {
                    // Sprawdź czy element jest obrócony
                    const isRotated =
                        existingItem.rotation === 90 ||
                        existingItem.rotation === -90;
                    const itemWidth =
                        ((isRotated ? dims.depth : dims.width) / 100) *
                        ELEMENT_SIZE;
                    const itemHeight =
                        ((isRotated ? dims.width : dims.depth) / 100) *
                        ELEMENT_SIZE;

                    if (layoutDirection === "horizontal") {
                        currentX = existingItem.position.x + itemWidth;
                        currentY = existingItem.position.y;
                    } else {
                        currentX = existingItem.position.x;
                        currentY = existingItem.position.y + itemHeight;
                    }
                }
            } else {
                // Nowy element - oblicz pozycję i auto-połącz
                const dims = parseDimensions(cartItem.data.description);

                // Po narożniku elementy są obrócone o 90° - wymiary się zamieniają
                const isRotated = layoutDirection === "vertical";
                const itemWidth = dims
                    ? ((isRotated ? dims.depth : dims.width) / 100) *
                      ELEMENT_SIZE
                    : ELEMENT_SIZE;
                const itemHeight = dims
                    ? ((isRotated ? dims.width : dims.depth) / 100) *
                      ELEMENT_SIZE
                    : ELEMENT_SIZE;

                let newX = currentX;
                let newY = currentY;
                let snappedTo: string | null = null;
                let snapSide: "left" | "right" | "top" | "bottom" | null = null;

                // Jeśli jest poprzedni element - auto-połącz
                const prevItem = newItems[newItems.length - 1];
                if (prevItem) {
                    const prevDims = parseDimensions(prevItem.data.description);
                    // Sprawdź czy poprzedni element jest obrócony (90°)
                    const prevIsRotated =
                        prevItem.rotation === 90 || prevItem.rotation === -90;
                    const prevWidth = prevDims
                        ? ((prevIsRotated ? prevDims.depth : prevDims.width) /
                              100) *
                          ELEMENT_SIZE
                        : ELEMENT_SIZE;
                    const prevHeight = prevDims
                        ? ((prevIsRotated ? prevDims.width : prevDims.depth) /
                              100) *
                          ELEMENT_SIZE
                        : ELEMENT_SIZE;

                    if (layoutDirection === "horizontal") {
                        // Układaj w prawo
                        newX = prevItem.position.x + prevWidth;
                        newY = prevItem.position.y;
                        snappedTo = prevItem.id;
                        snapSide = "left";
                    } else {
                        // Układaj w dół (po narożniku)
                        // Wyrównaj do prawej krawędzi poprzedniego elementu
                        newX = prevItem.position.x + prevWidth - itemWidth;
                        newY = prevItem.position.y + prevHeight;
                        snappedTo = prevItem.id;
                        snapSide = "top";
                    }
                }

                const newItem: FurnitureItem = {
                    id: generateId(),
                    name: cartItem.name,
                    data: cartItem.data,
                    position: { x: newX, y: newY },
                    rotation: isRotated ? 90 : 0, // Po narożniku obrót 90° (dół obrazka w lewo)
                    flipped: false,
                    locked: false,
                    snappedTo,
                    snapSide,
                    cartIndex: index,
                };

                newItems.push(newItem);

                // Dodaj połączenie
                if (snappedTo && snapSide) {
                    newConnections.push({
                        itemId: newItem.id,
                        targetId: snappedTo,
                        side: snapSide,
                    });
                }

                // Sprawdź czy to narożnik - zmień kierunek
                if (cartItem.data.isCorner) {
                    layoutDirection = "vertical";
                }

                // Aktualizuj pozycję dla następnego elementu
                if (layoutDirection === "horizontal") {
                    currentX = newX + itemWidth;
                } else {
                    // Dla układu pionowego: currentX to prawa krawędź elementu
                    // (następny element wyrówna się do tej prawej krawędzi)
                    currentX = newX + itemWidth;
                    currentY = newY + itemHeight;
                }
            }
        });

        setItems(newItems);
        setConnections(newConnections);
        prevCartLengthRef.current = currentLength;
    }, [cart.length, items.length, storageKey]);

    // Oblicz strefy snap dla wszystkich elementów
    const snapZones = useMemo((): SnapZone[] => {
        if (!snapEnabled || !draggedItem) return [];

        const zones: SnapZone[] = [];
        const draggedItemData = items.find((i) => i.id === draggedItem);
        if (!draggedItemData) return [];

        const draggedDims = parseDimensions(draggedItemData.data.description);
        if (!draggedDims) return [];

        // Użyj efektywnych wymiarów z uwzględnieniem rotacji
        const effectiveDraggedDims = getEffectiveDimensions(
            draggedDims,
            draggedItemData.rotation
        );
        const draggedW =
            (effectiveDraggedDims.width / 100) * ELEMENT_SIZE * zoom;
        const draggedH =
            (effectiveDraggedDims.depth / 100) * ELEMENT_SIZE * zoom;

        for (const item of items) {
            if (item.id === draggedItem) continue;

            const dims = parseDimensions(item.data.description);
            if (!dims) continue;

            // Użyj efektywnych wymiarów z uwzględnieniem rotacji
            const effectiveDims = getEffectiveDimensions(dims, item.rotation);
            const w = (effectiveDims.width / 100) * ELEMENT_SIZE * zoom;
            const h = (effectiveDims.depth / 100) * ELEMENT_SIZE * zoom;
            const isCorner = item.data.isCorner;

            // Prawa strona elementu (snap z lewej strony przeciąganego)
            zones.push({
                x: item.position.x + w,
                y: item.position.y,
                width: SNAP_ZONE_SIZE,
                height: h,
                side: "left",
                targetId: item.id,
            });

            // Lewa strona elementu (snap z prawej strony przeciąganego)
            zones.push({
                x: item.position.x - SNAP_ZONE_SIZE,
                y: item.position.y,
                width: SNAP_ZONE_SIZE,
                height: h,
                side: "right",
                targetId: item.id,
            });

            // Dolna strona elementu (snap z góry przeciąganego) - szczególnie dla narożników
            zones.push({
                x: item.position.x,
                y: item.position.y + h,
                width: w,
                height: SNAP_ZONE_SIZE,
                side: "top",
                targetId: item.id,
                isCornerSnap: isCorner,
            });

            // Górna strona elementu (snap z dołu przeciąganego)
            zones.push({
                x: item.position.x,
                y: item.position.y - SNAP_ZONE_SIZE,
                width: w,
                height: SNAP_ZONE_SIZE,
                side: "bottom",
                targetId: item.id,
            });
        }

        return zones;
    }, [items, draggedItem, snapEnabled, zoom]);

    // Znajdź punkt snap
    const findSnapPoint = useCallback(
        (
            itemId: string,
            position: Position,
            itemDims: Dimensions | null,
            itemRotation: number = 0
        ): {
            position: Position;
            connection: SnapConnection | null;
            shouldLock: boolean;
        } => {
            if (!snapEnabled || !itemDims)
                return { position, connection: null, shouldLock: false };

            // Użyj efektywnych wymiarów z uwzględnieniem rotacji
            const effectiveItemDims = getEffectiveDimensions(
                itemDims,
                itemRotation
            );
            const itemWidth =
                (effectiveItemDims.width / 100) * ELEMENT_SIZE * zoom;
            const itemHeight =
                (effectiveItemDims.depth / 100) * ELEMENT_SIZE * zoom;

            let closestSnap: {
                position: Position;
                connection: SnapConnection;
                distance: number;
                shouldLock: boolean;
            } | null = null;

            for (const item of items) {
                if (item.id === itemId) continue;

                const otherDims = parseDimensions(item.data.description);
                if (!otherDims) continue;

                // Użyj efektywnych wymiarów z uwzględnieniem rotacji
                const effectiveOtherDims = getEffectiveDimensions(
                    otherDims,
                    item.rotation
                );
                const otherWidth =
                    (effectiveOtherDims.width / 100) * ELEMENT_SIZE * zoom;
                const otherHeight =
                    (effectiveOtherDims.depth / 100) * ELEMENT_SIZE * zoom;
                const isCorner = item.data.isCorner;

                // Snap do prawej strony - element przylega DOKŁADNIE do prawej krawędzi
                const rightSnapX = item.position.x + otherWidth;
                const rightSnapY = item.position.y;
                const rightDist = Math.sqrt(
                    Math.pow(position.x - rightSnapX, 2) +
                        Math.pow(position.y - rightSnapY, 2)
                );

                if (
                    rightDist < SNAP_THRESHOLD &&
                    (!closestSnap || rightDist < closestSnap.distance)
                ) {
                    closestSnap = {
                        position: { x: rightSnapX, y: rightSnapY },
                        connection: { itemId, targetId: item.id, side: "left" },
                        distance: rightDist,
                        shouldLock: true,
                    };
                }

                // Snap do lewej strony
                const leftSnapX = item.position.x - itemWidth;
                const leftSnapY = item.position.y;
                const leftDist = Math.sqrt(
                    Math.pow(position.x - leftSnapX, 2) +
                        Math.pow(position.y - leftSnapY, 2)
                );

                if (
                    leftDist < SNAP_THRESHOLD &&
                    (!closestSnap || leftDist < closestSnap.distance)
                ) {
                    closestSnap = {
                        position: { x: leftSnapX, y: leftSnapY },
                        connection: {
                            itemId,
                            targetId: item.id,
                            side: "right",
                        },
                        distance: leftDist,
                        shouldLock: true,
                    };
                }

                // Snap do dołu (po narożniku - element idzie w dół)
                // Wyrównaj do prawej krawędzi narożnika
                const bottomSnapX = isCorner
                    ? item.position.x + otherWidth - itemWidth
                    : item.position.x;
                const bottomSnapY = item.position.y + otherHeight;
                const bottomDist = Math.sqrt(
                    Math.pow(position.x - bottomSnapX, 2) +
                        Math.pow(position.y - bottomSnapY, 2)
                );

                if (
                    bottomDist < SNAP_THRESHOLD &&
                    (!closestSnap || bottomDist < closestSnap.distance)
                ) {
                    closestSnap = {
                        position: { x: bottomSnapX, y: bottomSnapY },
                        connection: { itemId, targetId: item.id, side: "top" },
                        distance: bottomDist,
                        shouldLock: true,
                    };
                }

                // Snap do góry
                const topSnapX = item.position.x;
                const topSnapY = item.position.y - itemHeight;
                const topDist = Math.sqrt(
                    Math.pow(position.x - topSnapX, 2) +
                        Math.pow(position.y - topSnapY, 2)
                );

                if (
                    topDist < SNAP_THRESHOLD &&
                    (!closestSnap || topDist < closestSnap.distance)
                ) {
                    closestSnap = {
                        position: { x: topSnapX, y: topSnapY },
                        connection: {
                            itemId,
                            targetId: item.id,
                            side: "bottom",
                        },
                        distance: topDist,
                        shouldLock: true,
                    };
                }
            }

            if (closestSnap) {
                setActiveSnapZone({
                    x: closestSnap.position.x,
                    y: closestSnap.position.y,
                    width: itemWidth,
                    height: itemHeight,
                    side: closestSnap.connection.side,
                    targetId: closestSnap.connection.targetId,
                });
                return {
                    position: closestSnap.position,
                    connection: closestSnap.connection,
                    shouldLock: closestSnap.shouldLock,
                };
            }

            setActiveSnapZone(null);
            return { position, connection: null, shouldLock: false };
        },
        [items, snapEnabled, zoom]
    );

    // Mouse handlers
    const handleMouseDown = useCallback(
        (e: React.MouseEvent, itemId: string) => {
            const item = items.find((i) => i.id === itemId);
            if (!item) return;

            e.preventDefault();
            e.stopPropagation();

            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            setDraggedItem(itemId);
            setHasDragged(false);
            setDragOffset({
                x: (e.clientX - rect.left) / zoom - item.position.x,
                y: (e.clientY - rect.top) / zoom - item.position.y,
            });
        },
        [items, zoom]
    );

    const handleTouchStart = useCallback(
        (e: React.TouchEvent, itemId: string) => {
            const item = items.find((i) => i.id === itemId);
            if (!item) return;

            e.stopPropagation();

            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const touch = e.touches[0];
            setDraggedItem(itemId);
            setHasDragged(false);
            setDragOffset({
                x: (touch.clientX - rect.left) / zoom - item.position.x,
                y: (touch.clientY - rect.top) / zoom - item.position.y,
            });
        },
        [items, zoom]
    );

    // Po puszczeniu
    const handleMouseUp = useCallback(() => {
        setDraggedItem(null);
        setActiveSnapZone(null);
    }, []);

    const handleTouchEnd = useCallback(() => {
        setDraggedItem(null);
        setActiveSnapZone(null);
    }, []);

    // Drag handling
    const handleCanvasMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!draggedItem) return;

            setHasDragged(true);

            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const newX = (e.clientX - rect.left) / zoom - dragOffset.x;
            const newY = (e.clientY - rect.top) / zoom - dragOffset.y;

            const item = items.find((i) => i.id === draggedItem);
            const dims = item ? parseDimensions(item.data.description) : null;

            const { position: snappedPos, connection } = findSnapPoint(
                draggedItem,
                { x: newX, y: newY },
                dims,
                item?.rotation || 0
            );

            // Jeśli nie ma snap - użyj pozycji bez przyciągania i usuń połączenia
            const finalPosition = connection
                ? snappedPos
                : { x: newX, y: newY };

            setItems((prev) =>
                prev.map((it) =>
                    it.id === draggedItem
                        ? {
                              ...it,
                              position: finalPosition,
                              snappedTo: connection?.targetId || null,
                              snapSide: connection?.side || null,
                          }
                        : it
                )
            );

            // Aktualizuj połączenia - usuń jeśli nie ma snap, dodaj jeśli jest
            if (connection) {
                setConnections((prev) => {
                    const existing = prev.find(
                        (c) =>
                            c.itemId === connection.itemId &&
                            c.targetId === connection.targetId
                    );
                    if (existing) return prev;
                    return [
                        ...prev.filter((c) => c.itemId !== draggedItem),
                        connection,
                    ];
                });
            } else {
                // Usuń wszystkie połączenia z tym elementem gdy nie ma snap
                setConnections((prev) =>
                    prev.filter(
                        (c) =>
                            c.itemId !== draggedItem &&
                            c.targetId !== draggedItem
                    )
                );
            }
        },
        [draggedItem, dragOffset, findSnapPoint, zoom, items]
    );

    const handleCanvasTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (!draggedItem) return;

            setHasDragged(true);

            const touch = e.touches[0];
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            const newX = (touch.clientX - rect.left) / zoom - dragOffset.x;
            const newY = (touch.clientY - rect.top) / zoom - dragOffset.y;

            const item = items.find((i) => i.id === draggedItem);
            const dims = item ? parseDimensions(item.data.description) : null;

            const { position: snappedPos, connection } = findSnapPoint(
                draggedItem,
                { x: newX, y: newY },
                dims,
                item?.rotation || 0
            );

            // Jeśli nie ma snap - użyj pozycji bez przyciągania i usuń połączenia
            const finalPosition = connection
                ? snappedPos
                : { x: newX, y: newY };

            setItems((prev) =>
                prev.map((item) =>
                    item.id === draggedItem
                        ? {
                              ...item,
                              position: finalPosition,
                              snappedTo: connection?.targetId || null,
                              snapSide: connection?.side || null,
                          }
                        : item
                )
            );

            // Aktualizuj połączenia - usuń jeśli nie ma snap, dodaj jeśli jest
            if (connection) {
                setConnections((prev) => {
                    const existing = prev.find(
                        (c) =>
                            c.itemId === connection.itemId &&
                            c.targetId === connection.targetId
                    );
                    if (existing) return prev;
                    return [
                        ...prev.filter((c) => c.itemId !== draggedItem),
                        connection,
                    ];
                });
            } else {
                // Usuń wszystkie połączenia z tym elementem gdy nie ma snap
                setConnections((prev) =>
                    prev.filter(
                        (c) =>
                            c.itemId !== draggedItem &&
                            c.targetId !== draggedItem
                    )
                );
            }
        },
        [draggedItem, dragOffset, findSnapPoint, zoom, items]
    );

    const handleCanvasMouseUp = useCallback(() => {
        setDraggedItem(null);
        setActiveSnapZone(null);
    }, []);

    const handleCanvasTouchEnd = useCallback(() => {
        setDraggedItem(null);
        setActiveSnapZone(null);
    }, []);

    const rotateItem = useCallback((itemId: string) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId
                    ? { ...item, rotation: (item.rotation + 90) % 360 }
                    : item
            )
        );
    }, []);

    const flipItem = useCallback((itemId: string) => {
        setItems((prev) =>
            prev.map((item) =>
                item.id === itemId ? { ...item, flipped: !item.flipped } : item
            )
        );
    }, []);

    // Inteligentne usuwanie elementu - przesuwa pozostałe i łączy sąsiadów
    const removeItem = useCallback(
        (itemId: string) => {
            const itemToRemove = items.find((i) => i.id === itemId);
            if (!itemToRemove) return;

            const itemIndex = items.findIndex((i) => i.id === itemId);

            // Znajdź wymiary usuwanego elementu (z uwzględnieniem rotacji)
            const removedDims = parseDimensions(itemToRemove.data.description);
            const effectiveRemovedDims = removedDims
                ? getEffectiveDimensions(removedDims, itemToRemove.rotation)
                : null;
            const removedWidth = effectiveRemovedDims
                ? (effectiveRemovedDims.width / 100) * ELEMENT_SIZE
                : ELEMENT_SIZE;
            const removedHeight = effectiveRemovedDims
                ? (effectiveRemovedDims.depth / 100) * ELEMENT_SIZE
                : ELEMENT_SIZE;

            // Znajdź połączenia związane z usuwanym elementem
            const connectionsToRemoved = connections.filter(
                (c) => c.itemId === itemId || c.targetId === itemId
            );

            // Znajdź element poprzedni (do którego usuwany był podłączony)
            const prevConnection = connectionsToRemoved.find(
                (c) => c.itemId === itemId
            );
            const prevItemId = prevConnection?.targetId;

            // Znajdź elementy następne (które były podłączone do usuwanego)
            const nextConnections = connectionsToRemoved.filter(
                (c) => c.targetId === itemId
            );

            // Usuń element z listy
            const newItems = items.filter((i) => i.id !== itemId);

            // Aktualizuj cartIndex dla pozostałych elementów
            const updatedItems = newItems.map((item) => {
                if (item.cartIndex > itemToRemove.cartIndex) {
                    return { ...item, cartIndex: item.cartIndex - 1 };
                }
                return item;
            });

            // Przesuń elementy następne i połącz z poprzednim
            const finalItems = updatedItems.map((item) => {
                const wasConnectedToRemoved = nextConnections.some(
                    (c) => c.itemId === item.id
                );

                if (wasConnectedToRemoved && prevItemId) {
                    // Ten element był połączony z usuwanym - połącz go z poprzednikiem usuwanego
                    const prevItem = updatedItems.find(
                        (i) => i.id === prevItemId
                    );
                    if (prevItem) {
                        const prevDims = parseDimensions(
                            prevItem.data.description
                        );
                        // Uwzględnij rotację poprzedniego elementu
                        const effectivePrevDims = prevDims
                            ? getEffectiveDimensions(
                                  prevDims,
                                  prevItem.rotation
                              )
                            : null;
                        const prevWidth = effectivePrevDims
                            ? (effectivePrevDims.width / 100) * ELEMENT_SIZE
                            : ELEMENT_SIZE;
                        const prevHeight = effectivePrevDims
                            ? (effectivePrevDims.depth / 100) * ELEMENT_SIZE
                            : ELEMENT_SIZE;

                        // Określ kierunek snap na podstawie poprzedniego połączenia
                        const originalConnection = nextConnections.find(
                            (c) => c.itemId === item.id
                        );
                        const snapSide = originalConnection?.side || "left";

                        let newPosition = { ...item.position };
                        if (snapSide === "left") {
                            newPosition = {
                                x: prevItem.position.x + prevWidth,
                                y: prevItem.position.y,
                            };
                        } else if (snapSide === "top") {
                            const itemDims = parseDimensions(
                                item.data.description
                            );
                            // Uwzględnij rotację bieżącego elementu
                            const effectiveItemDims = itemDims
                                ? getEffectiveDimensions(
                                      itemDims,
                                      item.rotation
                                  )
                                : null;
                            const itemWidth = effectiveItemDims
                                ? (effectiveItemDims.width / 100) * ELEMENT_SIZE
                                : ELEMENT_SIZE;
                            newPosition = {
                                x: prevItem.position.x + prevWidth - itemWidth,
                                y: prevItem.position.y + prevHeight,
                            };
                        }

                        return {
                            ...item,
                            position: newPosition,
                            snappedTo: prevItemId,
                            snapSide,
                        };
                    }
                }

                // Jeśli element był połączony z usuwanym ale nie ma poprzednika - odłącz go
                if (item.snappedTo === itemId) {
                    return { ...item, snappedTo: null, snapSide: null };
                }

                return item;
            });

            // Aktualizuj połączenia
            let newConnections = connections.filter(
                (c) => c.itemId !== itemId && c.targetId !== itemId
            );

            // Dodaj nowe połączenia dla przeniesionych elementów
            if (prevItemId) {
                nextConnections.forEach((oldConn) => {
                    const movedItem = finalItems.find(
                        (i) => i.id === oldConn.itemId
                    );
                    if (movedItem && movedItem.snappedTo === prevItemId) {
                        newConnections.push({
                            itemId: movedItem.id,
                            targetId: prevItemId,
                            side: movedItem.snapSide || "left",
                        });
                    }
                });
            }

            setItems(finalItems);
            setConnections(newConnections);
            removeOne(itemToRemove.cartIndex);
        },
        [items, connections, removeOne]
    );

    // Oblicz grupy połączonych elementów
    const connectedGroups = useMemo(() => {
        const groups: string[][] = [];
        const visited = new Set<string>();

        const findGroup = (itemId: string): string[] => {
            if (visited.has(itemId)) return [];
            visited.add(itemId);

            const group = [itemId];
            const relatedConnections = connections.filter(
                (c) => c.itemId === itemId || c.targetId === itemId
            );

            for (const conn of relatedConnections) {
                const otherId =
                    conn.itemId === itemId ? conn.targetId : conn.itemId;
                group.push(...findGroup(otherId));
            }

            return group;
        };

        for (const item of items) {
            if (!visited.has(item.id)) {
                const group = findGroup(item.id);
                if (group.length > 0) {
                    groups.push(group);
                }
            }
        }

        return groups;
    }, [items, connections]);

    // Wymiary grup
    const groupDimensions = useMemo(() => {
        const dims: Record<
            string,
            { width: number; height: number; x: number; y: number }
        > = {};

        for (const group of connectedGroups) {
            if (group.length < 2) continue;

            let minX = Infinity,
                maxX = -Infinity,
                minY = Infinity,
                maxY = -Infinity;

            for (const itemId of group) {
                const item = items.find((i) => i.id === itemId);
                if (!item) continue;

                const itemDims = parseDimensions(item.data.description);
                if (!itemDims) continue;

                // Uwzględnij rotację
                const effectiveItemDims = getEffectiveDimensions(
                    itemDims,
                    item.rotation
                );
                const w = (effectiveItemDims.width / 100) * ELEMENT_SIZE * zoom;
                const h = (effectiveItemDims.depth / 100) * ELEMENT_SIZE * zoom;

                minX = Math.min(minX, item.position.x);
                maxX = Math.max(maxX, item.position.x + w);
                minY = Math.min(minY, item.position.y);
                maxY = Math.max(maxY, item.position.y + h);
            }

            dims[group.join("-")] = {
                width: Math.round(maxX - minX),
                height: Math.round(maxY - minY),
                x: minX,
                y: minY,
            };
        }

        return dims;
    }, [connectedGroups, items, zoom]);

    const totalPrice = useMemo(() => {
        return items.reduce((sum, item) => {
            const price = item.data.prices?.[selectedGroup];
            return sum + (price ? calculatePrice(price) : 0);
        }, 0);
    }, [items, selectedGroup, calculatePrice]);

    return (
        <div className="space-y-3">
            {/* Canvas */}
            <div
                ref={canvasRef}
                className="relative bg-white rounded-xl border-2 border-slate-200 overflow-hidden select-none touch-none min-h-[350px] sm:min-h-[400px] md:min-h-[500px]"
                style={{
                    height: "auto",
                    minHeight: "350px",
                    backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px),
                                      linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
                    backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                }}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onTouchMove={handleCanvasTouchMove}
                onTouchEnd={handleCanvasTouchEnd}
            >
                {/* Strefy snap - widoczne podczas przeciągania */}
                {draggedItem && snapEnabled && (
                    <>
                        {snapZones.map((zone, i) => {
                            const isActive =
                                activeSnapZone?.targetId === zone.targetId &&
                                activeSnapZone?.side === zone.side;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{
                                        opacity: isActive ? 1 : 0.7,
                                        scale: isActive ? 1.1 : 1,
                                    }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 20,
                                    }}
                                    className={`absolute rounded-xl pointer-events-none ${
                                        isActive
                                            ? "bg-gradient-to-b from-green-200 to-green-400 border-4 border-green-300 shadow-2xl shadow-green-500/60"
                                            : "bg-gradient-to-br from-blue-400/40 to-blue-600/40 border-3 border-dashed border-blue-400"
                                    }`}
                                    style={{
                                        left: zone.x - (isActive ? 5 : 0),
                                        top: zone.y - (isActive ? 5 : 0),
                                        width:
                                            (zone.side === "left" ||
                                            zone.side === "right"
                                                ? SNAP_ZONE_SIZE + 10
                                                : zone.width) +
                                            (isActive ? 10 : 0),
                                        height:
                                            (zone.side === "top" ||
                                            zone.side === "bottom"
                                                ? SNAP_ZONE_SIZE + 10
                                                : zone.height) +
                                            (isActive ? 10 : 0),
                                    }}
                                >
                                    {isActive && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-white rounded-full p-2 shadow-lg">
                                                <Link
                                                    size={20}
                                                    className="text-green-600"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {!isActive && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <motion.div
                                                animate={{
                                                    y: [0, -3, 0],
                                                }}
                                                transition={{
                                                    repeat: Infinity,
                                                    duration: 1.5,
                                                }}
                                            >
                                                <Magnet
                                                    size={18}
                                                    className="text-blue-600"
                                                />
                                            </motion.div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </>
                )}

                {/* Wskazówka podczas przeciągania */}
                {draggedItem && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
                    >
                        <motion.div
                            animate={
                                activeSnapZone
                                    ? {
                                          scale: [1, 1.05, 1],
                                          boxShadow: [
                                              "0 4px 20px rgba(34, 197, 94, 0.4)",
                                              "0 8px 30px rgba(34, 197, 94, 0.6)",
                                              "0 4px 20px rgba(34, 197, 94, 0.4)",
                                          ],
                                      }
                                    : {}
                            }
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className={`px-6 py-3 rounded-2xl text-xs w-max font-semibold shadow-2xl flex items-center gap-3 ${
                                activeSnapZone
                                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                                    : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                            }`}
                        >
                            {activeSnapZone ? (
                                <>
                                    <span>Puść teraz aby połączyć</span>
                                </>
                            ) : (
                                <>
                                    <span>Zbliż do strefy</span>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {/* Wymiary grup */}
                {showDimensions &&
                    Object.entries(groupDimensions).map(([key, dims]) => (
                        <React.Fragment key={key}>
                            {/* Szerokość na górze */}
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute flex items-center pointer-events-none"
                                style={{
                                    left: dims.x,
                                    top: dims.y - 35,
                                    width: dims.width,
                                }}
                            >
                                <div className="w-0.5 h-5 bg-blue-500" />
                                <div className="flex-1 h-0.5 bg-blue-500 relative">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-r-[8px] border-transparent border-r-blue-500" />
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-b-[4px] border-l-[8px] border-transparent border-l-blue-500" />
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-blue-600 text-white text-xs w-max font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                    {Math.round(
                                        (dims.width / zoom / ELEMENT_SIZE) * 100
                                    )}{" "}
                                    cm
                                </div>
                                <div className="w-0.5 h-5 bg-blue-500" />
                            </motion.div>

                            {/* Wysokość po prawej */}
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="absolute flex flex-col items-center pointer-events-none"
                                style={{
                                    left: dims.x + dims.width + 15,
                                    top: dims.y,
                                    height: dims.height,
                                }}
                            >
                                <div className="h-0.5 w-5 bg-green-500" />
                                <div className="w-0.5 flex-1 bg-green-500 relative">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-transparent border-b-green-500" />
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[8px] border-transparent border-t-green-500" />
                                </div>
                                <div className="absolute top-1/2 -translate-y-1/2 left-6 bg-green-600 text-white text-xs w-max font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
                                    {Math.round(
                                        (dims.height / zoom / ELEMENT_SIZE) *
                                            100
                                    )}{" "}
                                    cm
                                </div>
                                <div className="h-0.5 w-5 bg-green-500" />
                            </motion.div>
                        </React.Fragment>
                    ))}

                {/* Elementy */}
                <AnimatePresence>
                    {items.map((item) => {
                        const dims = parseDimensions(item.data.description);
                        // Użyj efektywnych wymiarów z uwzględnieniem rotacji
                        const effectiveDims = dims
                            ? getEffectiveDimensions(dims, item.rotation)
                            : null;
                        const itemWidth = effectiveDims
                            ? (effectiveDims.width / 100) * ELEMENT_SIZE * zoom
                            : ELEMENT_SIZE * zoom;
                        const itemHeight = effectiveDims
                            ? (effectiveDims.depth / 100) * ELEMENT_SIZE * zoom
                            : ELEMENT_SIZE * zoom;

                        const isInGroup = connectedGroups.some(
                            (g) => g.length > 1 && g.includes(item.id)
                        );
                        // Sprawdź czy inne elementy są podłączone DO tego elementu
                        const hasOthersConnected = connections.some(
                            (c) => c.targetId === item.id
                        );
                        const isConnected =
                            isInGroup || item.snappedTo || hasOthersConnected;
                        const isDragging = draggedItem === item.id;
                        const price = item.data.prices?.[selectedGroup];
                        const finalPrice = price ? calculatePrice(price) : null;
                        const isCorner = item.data.isCorner;

                        // Określ proporcje elementu
                        const isWide = dims && dims.width > dims.depth;
                        const isDeep = dims && dims.depth > dims.width;
                        const aspectRatio = dims ? dims.width / dims.depth : 1;

                        // Gradient na podstawie proporcji
                        const getProportionGradient = () => {
                            if (isCorner)
                                return "from-blue-100 via-blue-50 to-indigo-100";
                            if (isWide && aspectRatio > 1.3)
                                return "from-sky-50 via-white to-sky-100";
                            if (isDeep && aspectRatio < 0.7)
                                return "from-violet-50 via-white to-violet-100";
                            return "from-white via-slate-50 to-slate-100";
                        };

                        return (
                            <motion.div
                                key={item.id}
                                initial={{
                                    scale: 0.8,
                                    opacity: 0,
                                    x: item.position.x,
                                    y: item.position.y,
                                }}
                                animate={{
                                    scale: isDragging ? 1.08 : 1,
                                    opacity: 1,
                                    x: item.position.x,
                                    y: item.position.y,
                                    zIndex: isDragging ? 100 : 10,
                                }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 25,
                                }}
                                className="absolute group touch-none furniture-item cursor-grab active:cursor-grabbing"
                                style={{ width: itemWidth, height: itemHeight }}
                                onMouseDown={(e) => handleMouseDown(e, item.id)}
                                onTouchStart={(e) =>
                                    handleTouchStart(e, item.id)
                                }
                                title={
                                    dims
                                        ? `${item.name} - ${dims.width}×${dims.depth} cm`
                                        : item.name
                                }
                            >
                                {/* Główny kontener */}
                                <div
                                    className={`relative w-full h-full rounded-xl overflow-hidden transition-all duration-200 ${
                                        isDragging
                                            ? "ring-4 ring-blue-500 shadow-2xl shadow-blue-500/40"
                                            : isConnected
                                            ? "ring-2 ring-green-500 shadow-lg shadow-green-500/30"
                                            : "ring-1 ring-slate-200 shadow-md hover:ring-2 hover:ring-blue-400 hover:shadow-xl"
                                    }`}
                                >
                                    {/* Dla elementów obróconych: kontener ma zamienione wymiary, 
                                        obrazek musi być obrócony żeby pasował do kontenera */}
                                    {(() => {
                                        const isRotated90 =
                                            Math.abs(item.rotation) === 90;
                                        // Dla rotacji 90°: obrazek musi być obrócony o 90° żeby pasował do kontenera
                                        // o zamienionych wymiarach (depth x width zamiast width x depth)
                                        const rotateTransform = isRotated90
                                            ? "rotate(90deg)"
                                            : "";
                                        const flipTransform = item.flipped
                                            ? "scaleX(-1)"
                                            : "";
                                        const fullTransform = [
                                            rotateTransform,
                                            flipTransform,
                                        ]
                                            .filter(Boolean)
                                            .join(" ");

                                        return (
                                            <>
                                                <div
                                                    className={`absolute inset-0 bg-gradient-to-br ${getProportionGradient()}`}
                                                />

                                                {item.data.image ? (
                                                    <div
                                                        className="absolute inset-0 cursor-pointer flex items-center justify-center overflow-hidden"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!hasDragged) {
                                                                flipItem(
                                                                    item.id
                                                                );
                                                            }
                                                        }}
                                                        title="Kliknij aby odbić"
                                                    >
                                                        <div
                                                            className="relative"
                                                            style={{
                                                                width: isRotated90
                                                                    ? itemHeight
                                                                    : itemWidth,
                                                                height: isRotated90
                                                                    ? itemWidth
                                                                    : itemHeight,
                                                                transform:
                                                                    fullTransform,
                                                            }}
                                                        >
                                                            <Image
                                                                src={
                                                                    item.data
                                                                        .image
                                                                }
                                                                alt={item.name}
                                                                fill
                                                                className="object-contain p-1"
                                                                draggable={
                                                                    false
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="absolute inset-0 flex items-center justify-center"
                                                        style={{
                                                            transform:
                                                                flipTransform,
                                                        }}
                                                    >
                                                        <span className="text-xs font-medium text-slate-500 text-center px-1">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}

                                    {/* Badge narożnika */}
                                    {isCorner && (
                                        <div className="absolute top-1 left-1 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <CornerDownRight size={10} />
                                            NAR
                                        </div>
                                    )}
                                </div>

                                {/* Menu kontekstowe - tylko po hover */}
                                <div
                                    className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-slate-800 rounded-lg p-1 shadow-xl transition-opacity opacity-0 group-hover:opacity-100`}
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => rotateItem(item.id)}
                                        className="p-1.5 hover:bg-slate-700 rounded text-white transition-colors"
                                        title="Obróć"
                                    >
                                        <RotateCw size={12} />
                                    </button>
                                    <button
                                        onClick={() => flipItem(item.id)}
                                        className="p-1.5 hover:bg-slate-700 rounded text-white transition-colors"
                                        title="Odbij"
                                    >
                                        <FlipHorizontal size={12} />
                                    </button>
                                    <div className="w-px h-4 bg-slate-600 mx-0.5" />
                                    <button
                                        onClick={() => removeItem(item.id)}
                                        className="p-1.5 hover:bg-red-500 rounded text-white transition-colors"
                                        title="Usuń"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>

                                {/* Wskaźnik połączenia */}
                                {isConnected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white"
                                    >
                                        <Link
                                            size={12}
                                            className="text-white"
                                        />
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Linie połączeń */}
                <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ zIndex: 1 }}
                >
                    {connections.map((conn, i) => {
                        const item = items.find((it) => it.id === conn.itemId);
                        const target = items.find(
                            (it) => it.id === conn.targetId
                        );
                        if (!item || !target) return null;

                        const itemDims = parseDimensions(item.data.description);
                        const targetDims = parseDimensions(
                            target.data.description
                        );
                        if (!itemDims || !targetDims) return null;

                        // Użyj efektywnych wymiarów z uwzględnieniem rotacji
                        const effectiveItemDims = getEffectiveDimensions(
                            itemDims,
                            item.rotation
                        );
                        const effectiveTargetDims = getEffectiveDimensions(
                            targetDims,
                            target.rotation
                        );

                        const itemW =
                            (effectiveItemDims.width / 100) *
                            ELEMENT_SIZE *
                            zoom;
                        const itemH =
                            (effectiveItemDims.depth / 100) *
                            ELEMENT_SIZE *
                            zoom;
                        const targetW =
                            (effectiveTargetDims.width / 100) *
                            ELEMENT_SIZE *
                            zoom;
                        const targetH =
                            (effectiveTargetDims.depth / 100) *
                            ELEMENT_SIZE *
                            zoom;

                        let x1 = 0,
                            y1 = 0,
                            x2 = 0,
                            y2 = 0;

                        switch (conn.side) {
                            case "left":
                                x1 = item.position.x;
                                y1 = item.position.y + itemH / 2;
                                x2 = target.position.x + targetW;
                                y2 = target.position.y + targetH / 2;
                                break;
                            case "right":
                                x1 = item.position.x + itemW;
                                y1 = item.position.y + itemH / 2;
                                x2 = target.position.x;
                                y2 = target.position.y + targetH / 2;
                                break;
                            case "top":
                                x1 = item.position.x + itemW / 2;
                                y1 = item.position.y;
                                x2 = target.position.x + targetW / 2;
                                y2 = target.position.y + targetH;
                                break;
                            case "bottom":
                                x1 = item.position.x + itemW / 2;
                                y1 = item.position.y + itemH;
                                x2 = target.position.x + targetW / 2;
                                y2 = target.position.y;
                                break;
                        }

                        return (
                            <g key={i}>
                                <motion.line
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke="#22c55e"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                    opacity={0.7}
                                />
                                <circle
                                    cx={(x1 + x2) / 2}
                                    cy={(y1 + y2) / 2}
                                    r={6}
                                    fill="#22c55e"
                                />
                                <circle
                                    cx={(x1 + x2) / 2}
                                    cy={(y1 + y2) / 2}
                                    r={3}
                                    fill="white"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Pusty stan */}
                {items.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                        <div className="text-center">
                            <Move
                                size={48}
                                className="mx-auto mb-3 opacity-50"
                            />
                            <p className="text-base font-medium">
                                Dodaj elementy z tabeli powyżej
                            </p>
                            <p className="text-sm opacity-75">
                                Kliknij na elementy w tabeli aby je dodać
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista elementów */}
            {items.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                    {items.map((item) => {
                        const dims = parseDimensions(item.data.description);
                        const price = item.data.prices?.[selectedGroup];
                        const finalPrice = price ? calculatePrice(price) : null;
                        // Sprawdź czy element jest połączony (snappedTo lub inne są do niego podłączone)
                        const hasOthersConnected = connections.some(
                            (c) => c.targetId === item.id
                        );
                        const isElementConnected =
                            item.snappedTo || hasOthersConnected;

                        return (
                            <div
                                key={item.id}
                                className={`inline-flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5 text-sm transition-all flex-shrink-0 ${
                                    isElementConnected
                                        ? "border-green-300 bg-green-50 ring-1 ring-green-200"
                                        : "border-slate-200 hover:shadow-md"
                                }`}
                            >
                                {isElementConnected && (
                                    <Link
                                        size={12}
                                        className="text-green-500"
                                    />
                                )}
                                {item.data.image && (
                                    <div className="relative w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-slate-100">
                                        <Image
                                            src={item.data.image}
                                            alt=""
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="font-medium text-slate-800 text-xs">
                                        {item.name}
                                    </span>
                                    {dims && (
                                        <span className="text-[10px] text-slate-400">
                                            {dims.width}×{dims.depth} cm
                                        </span>
                                    )}
                                </div>
                                {finalPrice && (
                                    <span className="text-xs font-semibold text-green-600 ml-1">
                                        {finalPrice.toLocaleString("pl-PL")} zł
                                    </span>
                                )}
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors ml-1"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Instrukcje */}
            <div className="text-xs text-slate-500 bg-gradient-to-r from-slate-50 to-white rounded-xl p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 border border-slate-100">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <span className="flex items-center gap-1 sm:gap-1.5 bg-white px-1.5 sm:px-2 py-1 rounded-lg shadow-sm">
                        <Move
                            size={12}
                            className="text-blue-500 sm:w-[14px] sm:h-[14px]"
                        />
                        <span className="hidden sm:inline">
                            Przeciągaj elementy
                        </span>
                        <span className="sm:hidden">Przeciągaj</span>
                    </span>
                    <span className="flex items-center gap-1 sm:gap-1.5 bg-blue-50 px-1.5 sm:px-2 py-1 rounded-lg shadow-sm border border-blue-200">
                        <Magnet
                            size={12}
                            className="text-blue-600 sm:w-[14px] sm:h-[14px]"
                        />
                        <span className="hidden sm:inline">
                            Zbliż do strefy
                        </span>
                        <span className="sm:hidden">Zbliż</span>
                    </span>
                    <span className="flex items-center gap-1 sm:gap-1.5 bg-green-50 px-1.5 sm:px-2 py-1 rounded-lg shadow-sm border border-green-200">
                        <Link
                            size={12}
                            className="text-green-600 sm:w-[14px] sm:h-[14px]"
                        />
                        <span className="hidden sm:inline">
                            Puść aby połączyć
                        </span>
                        <span className="sm:hidden">Połącz</span>
                    </span>
                </div>

                {totalPrice > 0 && (
                    <div className="w-full sm:w-auto text-right hidden sm:flex items-center">
                        <span className="text-slate-600 text-xs sm:text-sm mr-2">
                            Razem:
                        </span>
                        <span className="text-base sm:text-lg font-bold text-green-600">
                            {totalPrice.toLocaleString("pl-PL")} zł
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
