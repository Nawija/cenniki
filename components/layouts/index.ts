// 3 Uniwersalne Layouty do wyświetlania cenników:
// - MpNidzicaLayout: lista produktów z elementami (karty) - dla mp-nidzica, top-line, benix, verikon, cristap, furnirest, best-meble, zoya
// - BomarLayout: kategorie produktów (karty z grupami cenowymi/rozmiarami) - dla bomar, halex
// - PuszmanLayout: tabela produktów z grupami cenowymi - dla puszman

export { default as BomarLayout } from "./BomarLayout";
export { default as MpNidzicaLayout } from "./MpNidzicaLayout";
export { default as PuszmanLayout } from "./PuszmanLayout";

// Uniwersalne layouty (aliasy dla kompatybilności wstecznej)
export { default as UniversalCategoryLayout } from "./UniversalCategoryLayout";
export { default as UniversalListLayout } from "./UniversalListLayout";
