export default function HomePage() {
    return (
        <div className="flex items-center justify-center flex-col space-y-4 mt-24 anim-opacity">
            <h1 className="font-bold text-3xl">Witaj w aplikacji cennikowej</h1>
            <p>
                Wybierz producenta po lewej stronie, aby zobaczyć produkty i
                ceny.
            </p>
            <p>
                Możesz również kliknąć tutaj, aby zobaczyć wszystkich
                producentów:
            </p>
        </div>
    );
}
