"use client";

import { useEffect, useRef } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

/**
 * 6-digit OTP entry: one box per digit, auto-advances focus as you type,
 * supports paste (e.g. from an SMS/WhatsApp autofill suggestion), and
 * fires onComplete the instant the last digit is entered so the caller
 * can auto-submit without a separate button press.
 */
export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  error = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
    // Only on mount — refocusing on every value change would steal focus
    // away from wherever the user is actively typing/pasting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setDigitAt(index: number, char: string) {
    const next = digits.slice();
    next[index] = char;
    const joined = next.join("").slice(0, length);
    onChange(joined);
    return joined;
  }

  function handleChange(index: number, raw: string) {
    const char = raw.replace(/\D/g, "").slice(-1);

    if (!char) {
      onChange(setEmptyAt(index));
      return;
    }

    const joined = setDigitAt(index, char);

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (joined.length === length) {
      onComplete?.(joined);
    }
  }

  function setEmptyAt(index: number) {
    const next = digits.slice();
    next[index] = "";
    return next.join("");
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        onChange(setEmptyAt(index - 1));
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    e.preventDefault();
    onChange(pasted);

    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === length) {
      onComplete?.(pasted);
    }
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={`h-12 w-10 rounded-lg border-2 text-center text-lg font-bold tracking-widest outline-none transition sm:h-14 sm:w-12 ${
            error
              ? "border-red-400 text-red-600 focus:border-red-500"
              : "border-gray-200 text-gray-900 focus:border-brand"
          } disabled:opacity-60`}
        />
      ))}
    </div>
  );
}
