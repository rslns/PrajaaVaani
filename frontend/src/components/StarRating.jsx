import { useState } from "react";

export default function StarRating({ value = 0, onRate, size = "text-xl" }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate?.(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`${size} leading-none transition-colors ${
            star <= display ? "text-saffron-500" : "text-navy-100"
          } ${onRate ? "cursor-pointer" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
