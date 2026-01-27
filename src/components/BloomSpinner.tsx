export default function BloomSpinner({ size = 64 }: { size?: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            className="animate-bloom"
        >
            {/* petals */}
            {[0, 60, 120, 180, 240, 300].map((degree) => (
                <ellipse 
                    key={degree}
                    cx="50"
                    cy="25"
                    rx="10"
                    ry="20"
                    fill="#c084fc"
                    transform={`rotate(${degree} 50 50)`}
                />
            ))}
            {/* center */}
            <circle cx="50" cy="50" r="10" fill="#7c3aed" />
        </svg>
    );
}