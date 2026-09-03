"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

/**
 * Explicit WhatsApp opt-in control, shared by signup and checkout so both
 * surfaces capture consent identically.
 *
 * Deliberate behaviour, required by the WhatsApp Business Terms and Meta
 * Commerce Policy:
 * - Unchecked by default. The caller owns the state and must initialise it to
 *   `false`; nothing here ever pre-ticks it.
 * - Purely optional. It never gates a signup or an order, so callers must not
 *   make submission depend on it.
 * - The descriptive text is a real `<label>`, so clicking it toggles the box,
 *   while the nested Privacy Policy link stays separately clickable for the
 *   full disclosure.
 */
export default function WhatsappConsentCheckbox({
  id = "whatsapp-consent",
  checked,
  onChange,
  disabled = false,
  className = "",
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border border-green-100 bg-green-50/50 p-3 ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-green-600 disabled:cursor-not-allowed"
      />
      <label htmlFor={id} className="cursor-pointer text-xs leading-relaxed text-gray-600">
        <MessageCircle size={13} className="mr-1 inline-block text-green-600" />
        I agree to receive order updates, delivery notifications, and support
        messages from Shopka on WhatsApp on the mobile number provided above.{" "}
        <span className="text-gray-400">
          (You can opt out anytime by contacting us.)
        </span>{" "}
        <Link
          href="/privacy"
          className="font-medium text-brand hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Privacy Policy
        </Link>
      </label>
    </div>
  );
}
