
import FactorManager from "@/components/FactorManager";
import Link from "next/link";

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-gray-100 p-10">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8 max-w-4xl mx-auto">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            � Zarządzanie Faktorami Cen
                        </h1>
                        <p className="text-gray-600">
                            Edytuj mnożniki cen i nazwy produktów dla każdego
                            producenta
                        </p>
                    </div>
                    <Link
                        href="/admin/upload"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                    >
                        Upload Cenników
                    </Link>
                </div>

                <FactorManager />
            </div>
        </div>
    );
}
