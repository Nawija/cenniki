import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Optymalizacje obrazów - używa mniej zasobów serverless
    images: {
        // Używaj lokalnego cache zamiast Image Optimization API (oszczędza quota)
        unoptimized: true,
        // Jeśli chcesz optimizację, ogranicz do tych formatów:
        // formats: ["image/webp"],
        // deviceSizes: [640, 750, 1080],
        // imageSizes: [16, 32, 64, 128],
    },

    // Włącz kompresję
    compress: true,

    // Generuj statyczne strony gdzie to możliwe
    output: "standalone",

    // Zmniejsz bundle size
    productionBrowserSourceMaps: false,

    // Optymalizacja bundlowania
    experimental: {
        // Optymalizuj pakiety
        optimizePackageImports: [
            "lucide-react",
            "@radix-ui/react-accordion",
            "@radix-ui/react-dialog",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
            "framer-motion",
        ],
    },

    // Headers dla cache
    async headers() {
        return [
            {
                // Cache dla statycznych assetów (obrazy, fonty, itp.)
                source: "/(.*)",
                headers: [
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                ],
            },
            {
                // Długi cache dla obrazów
                source: "/images/:path*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, max-age=31536000, immutable",
                    },
                ],
            },
            {
                // Cache dla stron producentów
                source: "/p/:slug*",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, s-maxage=3600, stale-while-revalidate=86400",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
