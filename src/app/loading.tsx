"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  { emoji: "🛍️", text: "Loading your deals..." },
  { emoji: "✨", text: "Almost there!" },
  { emoji: "🚀", text: "Launching Shopka..." },
  { emoji: "💰", text: "Counting savings..." },
  { emoji: "🎁", text: "Unwrapping goodies..." },
  { emoji: "😊", text: "Getting things ready..." },
  { emoji: "🛒", text: "Filling your cart..." },
  { emoji: "⚡", text: "Fast loading, promise!" },
];

export default function Loading() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const { emoji, text } = MESSAGES[idx];

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-white select-none">
      {/* Pulsing logo */}
      <div
        className="flex h-20 w-20 animate-[shopka-pulse_1.4s_ease-in-out_infinite] items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/30"
        aria-hidden="true"
      >
        <span className="text-3xl font-extrabold text-white">S</span>
      </div>

      {/* Animated emoji + message */}
      <div
        className="flex flex-col items-center gap-2 transition-all duration-300"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(6px)" }}
      >
        <span className="text-4xl" role="img" aria-label="loading">{emoji}</span>
        <p className="text-base font-semibold text-gray-700">{text}</p>
      </div>

      {/* Bouncing dots */}
      <div className="flex gap-2" aria-hidden="true">
        {[0, 0.15, 0.3].map((delay, i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 animate-[shopka-bounce_1s_ease-in-out_infinite] rounded-full bg-brand"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
    </div>
  );
}
