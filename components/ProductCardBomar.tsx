import Image from "next/image";
import React from "react";

type ProductData = {
    image?: string;
    material?: string;
    dimensions?: string;
    prices?: Record<string, number> | null;
    sizes?: Array<{ dimension: string; prices: string | number }>;
    options?: string[];
    description?: string[];
    previousName?: string;
};

type Props = {
    name: string;
    data: ProductData;
    category: string;
    overrides: Record<string, any>;
};

export default function ProductCardBomar({ name, data, category }: Props) {
    // Lightweight Bomar-specific card — for now shows different styling
    return (
        <div className="border rounded-lg p-4 bg-gradient-to-br from-white to-gray-50 shadow-sm">
            <div className="flex items-center space-x-4">
                {data.image ? (
                    <div className="w-24 h-24 relative flex-shrink-0">
                        <Image
                            src={data.image}
                            alt={name}
                            fill
                            className="object-contain"
                        />
                    </div>
                ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                        Brak
                    </div>
                )}

                <div className="flex-1">
                    <h3 className="text-lg font-semibold">{name}</h3>
                    {data.material && (
                        <p className="text-sm text-gray-500">{data.material}</p>
                    )}
                    {data.dimensions && (
                        <p className="text-sm text-gray-500">
                            {data.dimensions}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-3">
                {/* Show prices summary if available */}
                {data.prices ? (
                    <div className="text-sm text-gray-700">
                        {Object.entries(data.prices).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                                <span className="capitalize">{k}</span>
                                <span className="font-medium">{v} zł</span>
                            </div>
                        ))}
                    </div>
                ) : data.sizes ? (
                    <div className="text-sm text-gray-700">
                        {data.sizes.map((s, i) => (
                            <div key={i} className="flex justify-between">
                                <span>{s.dimension}</span>
                                <span className="font-medium">
                                    {s.prices} zł
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Brak cen</p>
                )}
            </div>
        </div>
    );
}
