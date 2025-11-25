import { ComponentType } from "react";
import PuszmanEditor from "./PuszmanEditor";
import BomarEditor from "./BomarEditor";

export interface EditorProps {
    initialData: Record<string, any>;
    manufacturerName: string;
    onSave: (data: Record<string, any>) => Promise<void>;
}

/**
 * Mapowanie producentów do ich specjalnych edytorów
 * Dodaj nowego producenta tutaj, aby miał osobną logikę
 */
const EDITOR_REGISTRY: Record<string, ComponentType<EditorProps>> = {
    puszman: PuszmanEditor,
    bomar: BomarEditor,
};

/**
 * Zwraca odpowiedni edytor dla producenta
 * @param manufacturerName - nazwa producenta (lowercase)
 * @returns komponent edytora lub null jeśli nie znaleziono
 */
export function getEditorForManufacturer(
    manufacturerName: string
): ComponentType<EditorProps> | null {
    return EDITOR_REGISTRY[manufacturerName.toLowerCase()] || null;
}

/**
 * Sprawdza czy producent ma specjalny edytor
 */
export function hasCustomEditor(manufacturerName: string): boolean {
    return manufacturerName.toLowerCase() in EDITOR_REGISTRY;
}

export default EDITOR_REGISTRY;
