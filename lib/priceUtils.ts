// lib/priceUtils.ts
// Pure functions - zero hooków, minimalne zużycie pamięci

export interface PriceResult {
    finalPrice: number;
    originalPrice?: number;
    hasDiscount: boolean;
}

export interface SurchargeResult {
    surchargePrice: number;
    originalSurchargePrice: number | null;
}

/** Największy faktor */
export const getEffectiveFactor = (
    global = 1,
    product = 1,
    override = 1
): number => Math.max(global, product, override);

/** Rabat: override > produkt > globalny */
export const getEffectiveDiscount = (
    global = 0,
    product = 0,
    override?: number | null
): number => override ?? product ?? global ?? 0;

/** Cena z faktorem i rabatem */
export const calculatePrice = (
    base: number,
    factor = 1,
    discount = 0
): PriceResult => {
    const withFactor = Math.round(base * factor);
    return discount > 0
        ? {
              finalPrice: Math.round(withFactor * (1 - discount / 100)),
              originalPrice: withFactor,
              hasDiscount: true,
          }
        : { finalPrice: withFactor, hasDiscount: false };
};

/** Cena dopłaty z rabatem */
export const calculateSurcharge = (
    finalPrice: number,
    originalPrice: number | undefined,
    percent: number,
    hasDiscount: boolean
): SurchargeResult => ({
    surchargePrice: Math.round(finalPrice * (1 + percent / 100)),
    originalSurchargePrice:
        hasDiscount && originalPrice
            ? Math.round(originalPrice * (1 + percent / 100))
            : null,
});

/** Pełne obliczenie ceny produktu (dla ProductCardBomar z customPrice) */
export const calculateProductPrice = (
    basePrice: number,
    options: {
        globalFactor?: number;
        productFactor?: number;
        overrideFactor?: number;
        productDiscount?: number;
        overrideDiscount?: number | null;
        customPrice?: number | null;
    }
): PriceResult => {
    const {
        globalFactor = 1,
        productFactor = 1,
        overrideFactor = 1,
        productDiscount = 0,
        overrideDiscount,
        customPrice,
    } = options;

    const effectiveDiscount = getEffectiveDiscount(
        0,
        productDiscount,
        overrideDiscount
    );

    // Jeśli jest customPrice, użyj jej
    if (customPrice && customPrice > 0) {
        return effectiveDiscount > 0
            ? {
                  finalPrice: Math.round(
                      customPrice * (1 - effectiveDiscount / 100)
                  ),
                  originalPrice: Math.round(customPrice),
                  hasDiscount: true,
              }
            : { finalPrice: Math.round(customPrice), hasDiscount: false };
    }

    // Standardowe obliczenie
    const effectiveFactor = getEffectiveFactor(
        globalFactor,
        productFactor,
        overrideFactor
    );

    return calculatePrice(basePrice, effectiveFactor, effectiveDiscount);
};
