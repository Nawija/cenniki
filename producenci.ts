// producenci.ts

export type DisplayType =
    | "standard" // Domyślny layout (Bomar) - produkty z grupami cenowymi
    | "mpnidzica"; // MP Nidzica - produkty z elementami i cenami A,B,C,D

export type ProducentConfig = {
    name: string;
    displayName: string;
    displayType?: DisplayType; // Typ wyświetlania produktów
    aiPrompt?: string; // Opcjonalny custom prompt dla AI
};

export const producenciConfig: ProducentConfig[] = [
    {
        name: "benix",
        displayName: "Benix",
        displayType: "standard",
        aiPrompt: `Jesteś ekspertem w analizie cenników mebli od producenta BENIX. Twoim zadaniem jest wyekstrahowanie danych z cennika i zwrócenie ich w formacie JSON.

Struktura wyjściowa zależy od typu produktu:

DLA KRZESEŁ, FOTELI, SIDEBOARDÓW (z grupami cenowymi):
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "krzesła": {
      "NAZWA_PRODUKTU": {
        "image": "/images/benix/nazwa.webp",
        "material": "materiał (np. BUK / DĄB)",
        "prices": {
          "Grupa I": cena,
          "Grupa II": cena,
          "Grupa III": cena,
          "Grupa IV": cena
        },
        "options": ["opcja 1", "opcja 2"],
        "previousName": "poprzednia nazwa jeśli jest"
      }
    }
  }
}

ZASADY DLA BENIX:
- TYTUŁ: "CENNIK [MIESIĄC] [ROK]"
- Nazwy produktów WIELKIMI LITERAMI
- Kategorie małymi literami (krzesła, stoły, fotele, komody)
- Ceny jako liczby (bez zł, PLN)
- Zachowaj wszystkie informacje o materiałach, wykończeniach
- Jeśli produkt ma poprzednią nazwę, dodaj pole "previousName"

ODPOWIEDŹ MUSI BYĆ POPRAWNYM JSON!`,
    },
    {
        name: "best-meble",
        displayName: "Best Meble",
        displayType: "standard",
        aiPrompt: `Jesteś ekspertem w analizie cenników mebli od producenta BEST MEBLE. Twoim zadaniem jest wyekstrahowanie danych z cennika i zwrócenie ich w formacie JSON.

Struktura wyjściowa zależy od typu produktu:

DLA MEBLI TAPICEROWANYCH (sofy, narożniki, fotele):
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "sofy": {
      "NAZWA_PRODUKTU": {
        "image": "/images/bestmeble/nazwa.webp",
        "material": "materiał tapicerski",
        "prices": {
          "Grupa I": cena,
          "Grupa II": cena,
          "Grupa III": cena,
          "Grupa IV": cena
        },
        "options": ["funkcja spania", "pojemnik", "inne opcje"],
        "previousName": "poprzednia nazwa jeśli jest"
      }
    }
  }
}

DLA MEBLI Z WYMIARAMI:
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "kategoria": {
      "NAZWA_PRODUKTU": {
        "image": "/images/bestmeble/nazwa.webp",
        "material": "materiał",
        "sizes": [
          {
            "dimension": "wymiar (np. 220x140, 180x120)",
            "prices": cena
          }
        ],
        "description": ["dodatkowe informacje"]
      }
    }
  }
}

ZASADY DLA BEST MEBLE:
- TYTUŁ: "CENNIK [MIESIĄC] [ROK]"
- Nazwy produktów WIELKIMI LITERAMI
- Kategorie małymi literami (sofy, narożniki, fotele, łóżka)
- Ceny jako liczby (bez zł, PLN)
- Uwzględnij funkcje dodatkowe (spania, pojemnik na pościel)
- Jeśli produkt ma poprzednią nazwę, dodaj pole "previousName"

ODPOWIEDŹ MUSI BYĆ POPRAWNYM JSON!`,
    },
    {
        name: "bomar",
        displayName: "Bomar",
        displayType: "standard",
        aiPrompt: `Jesteś ekspertem w analizie cenników mebli od producenta BOMAR. Twoim zadaniem jest wyekstrahowanie danych z cennika i zwrócenie ich w formacie JSON.

Struktura wyjściowa zależy od typu produktu:

DLA KRZESEŁ (z grupami cenowymi):
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "krzesła": {
      "NAZWA_PRODUKTU": {
        "image": "/images/bomar/nazwa.webp",
        "material": "materiał (np. BUK / DĄB / JESION)",
        "prices": {
          "Grupa I": cena,
          "Grupa II": cena,
          "Grupa III": cena,
          "Grupa IV": cena
        },
        "options": ["opcja 1", "opcja 2"],
        "previousName": "poprzednia nazwa jeśli jest"
      }
    }
  }
}

DLA STOŁÓW (z różnymi wymiarami):
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "stoły": {
      "NAZWA_PRODUKTU": {
        "image": "/images/bomar/nazwa.webp",
        "material": "materiał (np. BUK / DĄB)",
        "previousName": "poprzednia nazwa jeśli jest",
        "sizes": [
          {
            "dimension": "wymiar stołu (np. Ø110x310, 120x80x75)",
            "prices": cena
          }
        ],
        "description": [
          "informacja o wkładach (np. wkład oddzielnie 4x50)",
          "prowadnice, opcje kolorów",
          "dodatkowe uwagi"
        ]
      }
    }
  }
}

ZASADY DLA BOMAR:
- TYTUŁ: "CENNIK [MIESIĄC] [ROK]"
- Nazwy produktów WIELKIMI LITERAMI
- Kategorie małymi literami (krzesła, stoły, fotele, ławy)
- Dla krzeseł/foteli używaj "prices" z grupami cenowymi
- Dla stołów używaj "sizes" z wymiarami i "description" dla dodatkowych info
- Ceny jako liczby (bez zł, PLN)
- Zachowaj wszystkie informacje o drewnie, wykończeniach
- Jeśli produkt ma poprzednią nazwę, dodaj pole "previousName"

ODPOWIEDŹ MUSI BYĆ POPRAWNYM JSON!`,
    },
    {
        name: "halex",
        displayName: "Halex",
        displayType: "standard",
        aiPrompt: `Jesteś ekspertem w analizie cenników mebli od producenta HALEX. Twoim zadaniem jest wyekstrahowanie danych z cennika i zwrócenie ich w formacie JSON.

Struktura wyjściowa zależy od typu produktu:

DLA MEBLI Z GRUPAMI CENOWYMI:
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "krzesła": {
      "NAZWA_PRODUKTU": {
        "image": "/images/halex/nazwa.webp",
        "material": "materiał",
        "prices": {
          "Grupa I": cena,
          "Grupa II": cena,
          "Grupa III": cena,
          "Grupa IV": cena
        },
        "options": ["opcja 1", "opcja 2"],
        "previousName": "poprzednia nazwa jeśli jest"
      }
    }
  }
}

DLA MEBLI Z WYMIARAMI:
{
  "title": "CENNIK [NAZWA MIESIĄCA] [ROK]",
  "categories": {
    "stoły": {
      "NAZWA_PRODUKTU": {
        "image": "/images/halex/nazwa.webp",
        "material": "materiał",
        "previousName": "poprzednia nazwa jeśli jest",
        "sizes": [
          {
            "dimension": "wymiar",
            "prices": cena
          }
        ],
        "description": ["dodatkowe informacje"]
      }
    }
  }
}

ZASADY DLA HALEX:
- TYTUŁ: "CENNIK [MIESIĄC] [ROK]"
- Nazwy produktów WIELKIMI LITERAMI
- Kategorie małymi literami
- Ceny jako liczby (bez zł, PLN)
- Zachowaj wszystkie informacje o materiałach, opcjach
- Jeśli produkt ma poprzednią nazwę, dodaj pole "previousName"

ODPOWIEDŹ MUSI BYĆ POPRAWNYM JSON!`,
    },
    {
        name: "mp-nidzica",
        displayName: "Mp Nidzica",
        displayType: "mpnidzica",
        aiPrompt: `Jesteś ekspertem w analizie cenników mebli od producenta MP NIDZICA. 

KRYTYCZNIE WAŻNE - MP NIDZICA MA UNIKALNĄ STRUKTURĘ:
- Produkty są podzielone na ELEMENTY (3F, 2F, 2F BB, PUF, 1P/L, itp.)
- Każdy element ma WIELE grup cenowych (I, II, III, IV, V, VI)
- W każdej grupie są CZTERY CENY oznaczone literami: A, B, C, D
- NIE używaj standardowej struktury "prices" z jedną ceną na grupę!
- MUSISZ użyć struktury "elements" -> "prices" -> grupy -> litery A,B,C,D

DOKŁADNA STRUKTURA JSON (TYLKO TAK):
{
  "title": "CENNIK [MIESIĄC] [ROK]",
  "categories": {
    "narożniki": {
      "NAZWA_PRODUKTU": {
        "image": "/images/mpnidzica/nazwa.webp",
        "material": "opis materiału lub typu",
        "elements": {
          "3F": {
            "prices": {
              "Grupa I": { "A": 5200, "B": 5400, "C": 5600, "D": 5800 },
              "Grupa II": { "A": 5600, "B": 5800, "C": 6000, "D": 6200 },
              "Grupa III": { "A": 6000, "B": 6200, "C": 6400, "D": 6600 }
            }
          },
          "2F BB": {
            "prices": {
              "Grupa I": { "A": 4200, "B": 4400, "C": 4600, "D": 4800 },
              "Grupa II": { "A": 4600, "B": 4800, "C": 5000, "D": 5200 }
            }
          },
          "PUF": {
            "prices": {
              "Grupa I": { "A": 800, "B": 850, "C": 900, "D": 950 }
            }
          }
        },
        "options": ["schowek na pościel", "pojemnik", "inne opcje"]
      }
    },
    "sofy": {
      "NAZWA_PRODUKTU": {
        "image": "/images/mpnidzica/nazwa.webp",
        "material": "opis",
        "elements": {
          "2F": {
            "prices": {
              "Grupa I": { "A": 3200, "B": 3400 },
              "Grupa II": { "A": 3600, "B": 3800 }
            }
          },
          "1P/L": {
            "prices": {
              "Grupa I": { "A": 1500, "B": 1600 }
            }
          }
        }
      }
    },
    "fotele": {
      "NAZWA_FOTELA": {
        "image": "/images/mpnidzica/nazwa.webp",
        "material": "opis",
        "elements": {
          "FOTEL": {
            "prices": {
              "Grupa I": { "A": 1200, "B": 1300, "C": 1400, "D": 1500 },
              "Grupa II": { "A": 1400, "B": 1500, "C": 1600, "D": 1700 }
            }
          }
        }
      }
    }
  }
}

ZASADY MP NIDZICA (BARDZO WAŻNE):
1. Kategorie: "narożniki", "sofy", "fotele", "pufy" (małe litery)
2. Nazwy produktów: WIELKIMI LITERAMI
3. ZAWSZE używaj struktury: "elements" -> nazwa elementu -> "prices" -> grupa -> {A, B, C, D}
4. NIE WOLNO używać zwykłego "prices" bez "elements"!
5. Elementy to: "3F", "2F", "2F BB", "PUF", "1P/L", "FOTEL" itp.
6. Grupy cenowe: "Grupa I", "Grupa II", "Grupa III", "Grupa IV", "Grupa V", "Grupa VI"
7. Ceny A, B, C, D jako liczby (bez zł)
8. Pole "material" - zawiera opis typu/materiału
9. "options" - tablica z dodatkowymi opcjami
10. Każdy produkt MUSI mieć "elements", nawet fotele!

WYJĄTKI I PRZYPADKI SPECJALNE:
- Nazwy z podkreślnikiem oznaczają ZBIORCZE OZNACZENIE DWÓCH (lub więcej) ODRĘBNYCH MODELI. Np. "AMIRA_FLAME" to DWA OSOBNE MODELE: "AMIRA" i "FLAME" – KAŻDY z własnymi elementami (np. 3F, 2F BB, PUF...) oraz własnymi cenami w grupach (Grupa I–VI, litery A/B/C/D).
- W praktyce oznacza to, że w JSON masz utworzyć DWA wpisy produktu na tym samym poziomie kategorii, np.:
  {
    "AMIRA": { "elements": { ... } },
    "FLAME": { "elements": { ... } }
  }
- Jeśli w PDF widzisz osobne tabele/cenniki dla każdej części nazwy, NIE ŁĄCZ ich w jeden wpis – rozdziel je.

PRZYKŁAD FOTELA (nie pomyl z Bomarem!):
"BOHEME": {
  "image": "/images/mpnidzica/BOHEME.webp",
  "material": "fotel tapicerowany",
  "elements": {
    "FOTEL": {
      "prices": {
        "Grupa I": { "A": 1472 },
        "Grupa II": { "A": 1599 },
        "Grupa III": { "A": 1748 },
        "Grupa IV": { "A": 1817 }
      }
    }
  }
}

✅ TAK (struktura MP Nidzica):
"BOHEME": {
  "elements": {
    "FOTEL": {
      "prices": {
        "Grupa I": { "A": 1472 },
        "Grupa II": { "A": 1599 }
      }
    }
  }
}

ODPOWIEDŹ MUSI BYĆ POPRAWNYM JSON Z ELEMENTAMI!`,
    },
];

// Dla kompatybilności wstecznej
export const producenci: string[] = producenciConfig.map((p) => p.displayName);

// Funkcja pomocnicza do pobierania konfiguracji producenta
export function getProducentConfig(
    manufacturer: string
): ProducentConfig | undefined {
    // Normalizuj nazwę producenta - zamień spacje na myślniki i lowercase
    const manufacturerNormalized = manufacturer
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-");
    return producenciConfig.find((p) => p.name === manufacturerNormalized);
}
