"use client";

import { useState } from "react";
import { CheckCircle2, MapPin, RotateCcw, ShieldCheck, Truck } from "lucide-react";

interface DeliveryInfoProps {
  estimatedDeliveryLabel: string;
  codAllowed: boolean;
  freeDelivery: boolean;
}

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
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
      {/* Pincode row */}
      <div className="px-4 pt-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <MapPin
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand"
            />
            <input
              value={pincode}
              onChange={(e) => {
                setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setConfirmedPincode(null);
              }}
              inputMode="numeric"
              placeholder="Enter pincode for delivery date"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
            />
          </div>
          <button
            type="submit"
            disabled={!isValid}
            className="shrink-0 rounded-xl border-2 border-brand px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-300"
          >
            Check
          </button>
        </form>

        {/* Confirmed delivery message */}
        {confirmedPincode && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">
            <CheckCircle2 size={15} className="shrink-0 text-green-500" />
            <span>
              Delivering to{" "}
              <span className="font-bold">{confirmedPincode}</span> by{" "}
              <span className="font-bold">{estimatedDeliveryLabel}</span>
            </span>
          </div>
        )}
      </div>

      {/* Delivery badges row */}
      <div className="mt-3 grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-100 bg-white px-2 py-3">
        <div className="flex flex-col items-center gap-1.5 px-2 text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10">
            <Truck size={15} className="text-brand" />
          </div>
          <span className="text-[11px] font-semibold leading-tight text-gray-600">
            {freeDelivery ? "Free Delivery" : "Paid Delivery"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 px-2 text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10">
            <ShieldCheck size={15} className="text-brand" />
          </div>
          <span className="text-[11px] font-semibold leading-tight text-gray-600">
            {codAllowed ? "Cash on Delivery" : "Prepaid Only"}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 px-2 text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10">
            <RotateCcw size={15} className="text-brand" />
          </div>
          <span className="text-[11px] font-semibold leading-tight text-gray-600">
            7-Day Returns
          </span>
        </div>
      </div>
    </div>
  );
}
