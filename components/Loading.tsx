export default function Loading({ size = 96 }) {
    const px = typeof size === "number" ? `${size}px` : size;

    return (
        <div
            className="flex items-center justify-center h-full w-full"
            style={{ width: px, height: px }}
            aria-hidden={false}
            role="status"
        >
            {/* Tunel (lekko szare tło, zaokrąglone) */}
            <div
                className="relative w-full h-full rounded-2xl overflow-hidden"
                style={{ background: "#ececec" }}
            >
                {/* gradient lekko dający głębię */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            "linear-gradient(180deg, rgba(0,0,0,0.02), rgba(255,255,255,0.02))",
                    }}
                />

                {/* Środek - ring i czarne pole */}
                <div className="absolute inset-0 flex items-center justify-center">
                    {/* Ring */}
                    <div
                        className="absolute transform-gpu"
                        style={{ width: `48%`, height: `48%` }}
                    >
                        <div className="w-full h-full rounded-full border-4 border-gray-300 border-t-black animate-spin" />
                    </div>

                    {/* Czarne pole (zwija się / rozwija) */}
                    <div className="z-10 flex items-center justify-center">
                        <div
                            className="black-box"
                            style={{ width: `22%`, height: `22%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Local CSS keyframes dla animacji (Tailwind nie potrzebne dla keyframes tutaj) */}
            <style>{`
        @keyframes scaleSquish {
          0% { transform: scale(1,1); border-radius: 12%; }
          30% { transform: scale(0.6,1.15); border-radius: 24%; }
          60% { transform: scale(1.05,0.85); border-radius: 8%; }
          100% { transform: scale(1,1); border-radius: 12%; }
        }

        .black-box {
          background: #0a0a0a; /* czarne pole */
          box-shadow: 0 6px 18px rgba(10,10,10,0.18);
          animation: scaleSquish 1.25s ease-in-out infinite;
          will-change: transform, border-radius;
        }

        /* Drobne spowolnienie dla samego ringu - już używamy animate-spin z Tailwind,
           ale możemy lekko zmienić prędkość jeśli trzeba (tutaj nie nadpisujemy).
        */

        /* Dostosowanie dla mniejszych rozmiarów ekranu */
        @media (max-width: 420px) {
          .black-box { width: 28% !important; height: 28% !important; }
        }
      `}</style>
        </div>
    );
}
