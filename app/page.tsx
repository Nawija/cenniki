export default function HomePage() {
    return (
        <div className="flex flex-col items-center justify-center mt-24 space-y-8 text-center anim-opacity">
            <h1 className="text-5xl font-bold bg-gradient-to-b from-gray-300 to-gray-900 bg-clip-text text-transparent py-6">
                Witaj w aplikacji cennikowej
            </h1>
            
            <p className="text-lg text-gray-500 max-w-2xl">
                Odkryj dostępnych producentów i sprawdź ich produkty oraz ceny.  
                Skorzystaj z menu po lewej stronie lub przejdź bezpośrednio do listy wszystkich producentów.
            </p>
            
        </div>
    );
}
