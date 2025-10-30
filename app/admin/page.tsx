
import FactorManager from "@/components/FactorManager";
import Link from "next/link";

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-gray-100 pt-10">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-start justify-between mb-8 max-w-4xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            Zarządzanie Produktami
                        </h1>
                        <p className="text-gray-600">
                            Edytuj mnożniki cen i nazwy produktów dla każdego
                            producenta
                        </p>
                    </div>
                    <Link
                        href="/admin/upload"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                    >
                        Upload
                    </Link>
                </div>

                <FactorManager />
            </div>
        </div>
    );
}
