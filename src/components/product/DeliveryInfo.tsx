"use client";

import { useState } from "react";
import { CheckCircle2, MapPin, RotateCcw, Truck } from "lucide-react";

interface DeliveryInfoProps {
  estimatedDeliveryLabel: string;
  codAllowed: boolean;
  freeDelivery: boolean;
}

/**
 * A pincode field that personalizes the delivery message once a valid
 * 6-digit code is entered. We don't have a real serviceability API, so this
 * intentionally never claims to "check" the pincode — it just confirms the
 * same estimate and COD eligibility we already show, addressed to that PIN.
 * Faking a live availability check would be a false claim to the shopper.
 */
export default function DeliveryInfo({
  estimatedDeliveryLabel,
  codAllowed,
  freeDelivery,
}: DeliveryInfoProps) {
  const [pincode, setPincode] = useState("");
  const [confirmedPincode, setConfirmedPincode] = useState<string | null>(null);

  const isValid = /^[1-9][0-9]{5}$/.test(pincode);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isValid) setConfirmedPincode(pincode);
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={pincode}
            onChange={(e) => {
              setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setConfirmedPincode(null);
            }}
            inputMode="numeric"
            placeholder="Enter pincode for delivery date"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={!isValid}
          className="shrink-0 rounded-lg border-2 border-brand px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
        >
          Check
        </button>
      </form>

      {confirmedPincode && (
        <p className="mt-2.5 flex items-center gap-1.5 text-sm text-gray-700">
          <CheckCircle2 size={15} className="text-success" />
          Delivering to <span className="font-medium">{confirmedPincode}</span> by{" "}
          <span className="font-semibold">{estimatedDeliveryLabel}</span>
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 border-t border-gray-200 pt-3 text-xs text-gray-600 sm:grid-cols-3">
        <span className="flex items-center gap-1.5">
          <Truck size={14} className="text-brand" />
          {freeDelivery ? "Free delivery" : "Delivery charge applies"}
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={14} className="text-brand" />
          {codAllowed ? "Cash on Delivery available" : "Prepaid only"}
        </span>
        <span className="flex items-center gap-1.5">
          <RotateCcw size={14} className="text-brand" />
          7-day easy returns
        </span>
      </div>
    </div>
  );
}
