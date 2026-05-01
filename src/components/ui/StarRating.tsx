"use client";

import { useState } from "react";
import { StarIcon as SolidStar } from "@heroicons/react/24/solid";
import { StarIcon as OutlineStar } from "@heroicons/react/24/outline";

export default function StarRating({
  value = 0,
  onChange,
  size = 24,
}: {
  value?: number;
  onChange?: (rating: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = hover ? star <= hover : star <= value;

        const Icon = isActive ? SolidStar : OutlineStar;

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(null)}
            className="transition-transform hover:scale-110"
          >
            <Icon
              style={{ width: size, height: size }}
              className={
                isActive
                  ? "text-yellow-400"
                  : "text-slate-300"
              }
            />
          </button>
        );
      })}
    </div>
  );
}