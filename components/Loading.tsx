export default function GoogleSpinner({ size = 48, stroke = 3 }) {
    return (
        <div
            className="spinner-wrapper"
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
            aria-label="Loading"
        >
            <svg
                className="spinner"
                width={size}
                height={size}
                viewBox="0 0 50 50"
            >
                {/* gray track */}
                <circle
                    className="track"
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    strokeWidth={stroke}
                />
                {/* animated stroke */}
                <circle
                    className="path"
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    strokeWidth={stroke}
                />
            </svg>

            <style>{`
        .spinner {
          animation: rotate 1.6s linear infinite;
        }

        .track {
          stroke: #e5e7eb; /* light gray */
        }

        .path {
          stroke-linecap: round;
          stroke: #4285F4;
          stroke-dasharray: 1, 200;
          stroke-dashoffset: 0;
          animation:
            dash 1.6s cubic-bezier(0.4, 0.0, 0.2, 1) infinite,
            colors 6s ease-in-out infinite;
        }

        @keyframes rotate {
          100% {
            transform: rotate(360deg);
          }
        }

        /* pause slightly at the bottom, then accelerate */
        @keyframes dash {
          0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
          }
          40% {
            stroke-dasharray: 90, 200;
            stroke-dashoffset: -35;
          }
          100% {
            stroke-dasharray: 90, 200;
            stroke-dashoffset: -125;
          }
        }

        /* Google colors */
        @keyframes colors {
          0% { stroke: #4285F4; }
          25% { stroke: #EA4335; }
          50% { stroke: #FBBC05; }
          75% { stroke: #34A853; }
          100% { stroke: #4285F4; }
        }
      `}</style>
        </div>
    );
}
