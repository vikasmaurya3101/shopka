"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Pencil, Plus } from "lucide-react";
import { useSession } from "@/providers/SessionProvider";
import { useCart } from "@/hooks/useCart";
import { AddressData } from "@/types/order";
import { formatCurrency } from "@/lib/utils/currency";
import { calculateOrderTotals } from "@/lib/utils/order-total";
import { toShippableLines } from "@/lib/utils/shipping";
import Loader from "@/components/ui/Loader";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function getEstimatedDelivery() {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isSessionLoading, user } = useSession();
  const { cart, isLoading: isCartLoading, updateQuantity } = useCart();

  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(
    null
  );
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [step, setStep] = useState<"review" | "payment">("review");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "RAZORPAY">(
    "RAZORPAY"
  );
  const [editingQtyItemId, setEditingQtyItemId] = useState<string | null>(
    null
  );
  const [qtyDraft, setQtyDraft] = useState(1);
  const [isUpdatingQty, setIsUpdatingQty] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    houseNumber: "",
    apartment: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoadingAddresses(false);
      return;
    }

    fetch("/api/addresses")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setAddresses(json.data);
          const defaultAddr = json.data.find(
            (a: AddressData) => a.isDefault
          );
          setSelectedId(defaultAddr?.id ?? json.data[0]?.id ?? null);
          if (json.data.length === 0) setShowForm(true);
        }
      })
      .finally(() => setIsLoadingAddresses(false));
  }, [isAuthenticated]);

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingAddress(true);

    try {
      const res = await fetch(
        editingAddressId ? `/api/addresses/${editingAddressId}` : "/api/addresses",
        {
          method: editingAddressId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            ...(editingAddressId
              ? {}
              : { isDefault: addresses.length === 0 }),
            latitude: coords?.lat,
            longitude: coords?.lng,
          }),
        }
      );

      const json = await res.json();

      if (!json.success) {
        toast.error(json.message ?? "Unable to save address.");
        return;
      }

      if (editingAddressId) {
        setAddresses((prev) =>
          prev.map((a) => (a.id === editingAddressId ? json.data : a))
        );
        toast.success("Address updated");
      } else {
        setAddresses((prev) => [json.data, ...prev]);
        setSelectedId(json.data.id);
        toast.success("Address saved");
      }

      setShowForm(false);
      setEditingAddressId(null);
      setCoords(null);
    } finally {
      setIsSavingAddress(false);
    }
  }

  function openAddAddressForm() {
    setForm({
      fullName: "",
      phone: "",
      houseNumber: "",
      apartment: "",
      area: "",
      landmark: "",
      city: "",
      state: "",
      pincode: "",
    });
    setEditingAddressId(null);
    setCoords(null);
    setShowForm(true);
  }

  function openEditAddressForm(address: AddressData) {
    setForm({
      fullName: address.fullName,
      phone: address.phone,
      houseNumber: address.houseNumber,
      apartment: address.apartment ?? "",
      area: address.area,
      landmark: address.landmark ?? "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    });
    setEditingAddressId(address.id);
    setCoords(
      address.latitude && address.longitude
        ? { lat: address.latitude, lng: address.longitude }
        : null
    );
    setShowForm(true);
  }

  async function handleUpdateQty(itemId: string) {
    setIsUpdatingQty(true);
    try {
      const ok = await updateQuantity(itemId, qtyDraft);
      if (ok) {
        setEditingQtyItemId(null);
        toast.success("Quantity updated");
      }
    } finally {
      setIsUpdatingQty(false);
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });

        try {
          const res = await fetch(
            `/api/geocode/reverse?lat=${lat}&lng=${lng}`
          );
          const json = await res.json();

          if (json.success) {
            setForm((prev) => ({
              ...prev,
              area: json.data.area || prev.area,
              city: json.data.city || prev.city,
              state: json.data.state || prev.state,
              pincode: json.data.pincode || prev.pincode,
            }));
            toast.success("We've filled in your area, city, state, and pincode.");
          } else {
            toast.success("Location added — please fill in the rest below.");
          }
        } catch {
          toast.success("Location added — please fill in the rest below.");
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        toast.error(
          "Couldn't access your location. You can still enter your address manually."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleClearLocation() {
    setCoords(null);
    toast("Location removed. You can still fill in your address manually.");
  }

  async function finalizeOrder(payload: Record<string, unknown>) {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!json.success) {
      toast.error(json.message ?? "Unable to place order.");
      return false;
    }

    toast.success("Order placed successfully!");
    router.push(`/orders/${json.data.id}`);
    return true;
  }

  async function handlePlaceOrderCod() {
    setIsPlacingOrder(true);
    try {
      await finalizeOrder({ addressId: selectedId, paymentMethod: "COD" });
    } finally {
      setIsPlacingOrder(false);
    }
  }

  async function handlePayWithRazorpay() {
    setIsPlacingOrder(true);

    try {
      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        toast.error("Couldn't load Razorpay. Check your connection and try again.");
        return;
      }

      const orderRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
      });
      const orderJson = await orderRes.json();

      if (!orderJson.success) {
        toast.error(orderJson.message ?? "Unable to start payment.");
        return;
      }

      const selectedAddress = addresses.find((a) => a.id === selectedId);
      const { orderId, amount, currency, keyId } = orderJson.data;

      const razorpay = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: "Shopka",
        description: "Order payment",
        image: "/brand/logo-128.png",
        prefill: {
          name: selectedAddress?.fullName ?? user?.firstName ?? "",
          contact: selectedAddress?.phone ?? user?.phone ?? "",
          email: user?.email ?? "",
        },
        theme: { color: "#d6266f" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          await finalizeOrder({
            addressId: selectedId,
            paymentMethod: "RAZORPAY",
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => {
            setIsPlacingOrder(false);
          },
        },
      });

      razorpay.open();
    } catch {
      toast.error("Unable to start payment. Please try again.");
      setIsPlacingOrder(false);
    }
  }

  function handleContinueToPayment() {
    if (!selectedId) {
      toast.error("Please select a delivery address.");
      setShowAddressPicker(true);
      return;
    }
    setStep("payment");
  }

  async function handlePlaceOrder() {
    if (!selectedId) {
      toast.error("Please select a delivery address.");
      return;
    }

    if (paymentMethod === "RAZORPAY") {
      await handlePayWithRazorpay();
    } else {
      await handlePlaceOrderCod();
    }
  }

  if (isSessionLoading || isCartLoading || isLoadingAddresses) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <Loader size="lg" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-lg text-gray-600">
          Please login to proceed to checkout.
        </p>
      </main>
    );
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <p className="text-lg text-gray-600">Your cart is empty.</p>
      </main>
    );
  }

  // Check if all products in cart allow COD
  const allProductsAllowCOD = items.every((item) => item.product.codAllowed);

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.sellingPrice) * item.quantity,
    0
  );
  const mrpTotal = items.reduce(
    (sum, item) => sum + Number(item.product.mrp) * item.quantity,
    0
  );
  const totalDiscount = mrpTotal - subtotal;

  // Shipping is charged exactly as the cart page displayed it. Both payment
  // options are priced up-front so each radio can show its own real total;
  // `totals` is whichever one is currently selected.
  const lines = toShippableLines(items);
  const prepaidTotals = calculateOrderTotals({
    subtotal,
    lines,
    isPrepaid: true,
  });
  const codTotals = calculateOrderTotals({
    subtotal,
    lines,
    isPrepaid: false,
  });
  const totals = paymentMethod === "RAZORPAY" ? prepaidTotals : codTotals;
  const payableAmount = totals.payable;
  // Savings off MRP for the selected payment method. Shipping is a charge, not
  // a discount, so it must not be netted into this figure.
  const savings = totalDiscount + totals.prepaidDiscount;
  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        {/* Step indicator */}
        <div className="mb-6 flex items-center justify-center gap-3">
          {(["review", "payment"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    step === s
                      ? "border-brand bg-brand text-white"
                      : (s === "review" && step === "payment")
                      ? "border-brand text-brand"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs font-medium ${
                    step === s ? "text-brand" : "text-gray-400"
                  }`}
                >
                  {s === "review" ? "Review" : "Payment"}
                </span>
              </div>
              {i === 0 && <div className="mb-4 h-px w-12 bg-gray-300 sm:w-24" />}
            </div>
          ))}
        </div>

        {step === "review" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {/* Product details */}
              <div className="rounded-xl border bg-white">
                <div className="flex items-center gap-2 border-b p-4 text-sm text-gray-600">
                  <span>🚚</span>
                  <span>
                    Estimated Delivery by{" "}
                    <span className="font-medium text-gray-800">
                      {getEstimatedDelivery()}
                    </span>
                  </span>
                </div>

                {items.map((item) => {
                  const mrp = Number(item.product.mrp);
                  const price = Number(item.product.sellingPrice);
                  const off =
                    mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
                  const thumb =
                    item.product.images.find((img) => img.isThumbnail)?.url ??
                    item.product.images[0]?.url;

                  return (
                    <div
                      key={item.id}
                      className="flex gap-3 border-b p-4 last:border-0"
                    >
                      {thumb && (
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                          <Image
                            src={thumb}
                            alt={item.product.name}
                            fill
                            sizes="56px"
                            className="object-contain p-1"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">
                            {item.product.name}
                          </p>
                          <button
                            onClick={() => {
                              if (editingQtyItemId === item.id) {
                                setEditingQtyItemId(null);
                              } else {
                                setQtyDraft(item.quantity);
                                setEditingQtyItemId(item.id);
                              }
                            }}
                            className="whitespace-nowrap text-xs font-semibold text-brand hover:underline"
                          >
                            EDIT
                          </button>
                        </div>
                        <p className="mt-1 text-sm">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(price)}
                          </span>{" "}
                          {off > 0 && (
                            <>
                              <span className="text-gray-400 line-through">
                                {formatCurrency(mrp)}
                              </span>{" "}
                              <span className="font-medium text-green-600">
                                {off}% Off
                              </span>
                            </>
                          )}
                        </p>

                        {editingQtyItemId === item.id ? (
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex items-center overflow-hidden rounded-lg border">
                              <button
                                type="button"
                                onClick={() =>
                                  setQtyDraft((q) => Math.max(1, q - 1))
                                }
                                disabled={qtyDraft <= 1}
                                className="tap-shrink flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm font-medium text-gray-800">
                                {qtyDraft}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setQtyDraft((q) =>
                                    Math.min(item.product.stock, q + 1)
                                  )
                                }
                                disabled={qtyDraft >= item.product.stock}
                                className="tap-shrink flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              onClick={() => handleUpdateQty(item.id)}
                              disabled={isUpdatingQty}
                              className="tap-shrink rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                            >
                              {isUpdatingQty ? "Updating..." : "Update"}
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">
                            Qty: {item.quantity}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {items[0]?.product.seller?.businessName && (
                  <div className="border-t p-4 text-xs text-gray-400">
                    Sold by: {items[0].product.seller.businessName}
                  </div>
                )}
              </div>

              {/* Delivery address */}
              <div className="rounded-xl border bg-white p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span>📍</span>
                  <h2 className="font-semibold text-gray-800">
                    Delivery Address
                  </h2>
                </div>

                {selectedAddress && !showAddressPicker ? (
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-800">
                        {selectedAddress.fullName}
                      </p>
                      <p className="text-gray-600">
                        {selectedAddress.completeAddress}
                      </p>
                      <p className="text-gray-500">{selectedAddress.phone}</p>
                    </div>
                    <button
                      onClick={() => setShowAddressPicker(true)}
                      className="whitespace-nowrap text-sm font-semibold text-brand hover:underline"
                    >
                      CHANGE
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">
                        {showForm
                          ? editingAddressId
                            ? "Edit address"
                            : "Add a delivery address"
                          : "Choose an address"}
                      </span>
                      <button
                        onClick={() => {
                          if (showForm) {
                            setShowForm(false);
                            setEditingAddressId(null);
                          } else {
                            openAddAddressForm();
                          }
                        }}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        {showForm ? "Cancel" : "+ Add New"}
                      </button>
                    </div>

                    {!showForm && (
                      <div className="space-y-2">
                        {addresses.map((address) => (
                          <label
                            key={address.id}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                              selectedId === address.id
                                ? "border-brand bg-brand-50"
                                : "border-gray-200"
                            }`}
                          >
                            <input
                              type="radio"
                              name="address"
                              checked={selectedId === address.id}
                              onChange={() => {
                                setSelectedId(address.id);
                                setShowAddressPicker(false);
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1 text-sm">
                              <p className="font-medium text-gray-800">
                                {address.fullName} · {address.phone}
                              </p>
                              <p className="text-gray-600">
                                {address.completeAddress}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                openEditAddressForm(address);
                              }}
                              className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand hover:underline"
                            >
                              <Pencil size={12} />
                              Edit
                            </button>
                          </label>
                        ))}
                      </div>
                    )}

                    {showForm && (
                      <form
                        onSubmit={handleAddAddress}
                        className="grid gap-3 sm:grid-cols-2"
                      >
                        {!coords ? (
                          <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={isLocating}
                            className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand-100 bg-brand-50/40 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand-50 disabled:opacity-60 sm:col-span-2"
                          >
                            📍{" "}
                            {isLocating
                              ? "Detecting your location..."
                              : "Use my current location"}
                          </button>
                        ) : (
                          <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-brand-100 bg-brand-50/40 px-4 py-2.5 sm:col-span-2">
                            <span className="text-sm font-semibold text-brand-dark">
                              📍 Delivering near your current location
                            </span>
                            <div className="flex items-center gap-3 text-xs font-semibold">
                              <button
                                type="button"
                                onClick={handleUseCurrentLocation}
                                disabled={isLocating}
                                className="text-brand hover:underline disabled:opacity-60"
                              >
                                {isLocating ? "Updating..." : "Update"}
                              </button>
                              <button
                                type="button"
                                onClick={handleClearLocation}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}
                        <input
                          required
                          placeholder="Full Name"
                          value={form.fullName}
                          onChange={(e) =>
                            setForm({ ...form, fullName: e.target.value })
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-brand sm:col-span-2"
                        />
                        <input
                          required
                          placeholder="Phone"
                          value={form.phone}
                          onChange={(e) =>
                            setForm({ ...form, phone: e.target.value })
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-brand"
                        />
                        <input
                          required
                          placeholder="Pincode"
                          value={form.pincode}
                          onChange={(e) =>
                            setForm({ ...form, pincode: e.target.value })
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-brand"
                        />
                        <input
                          required
                          placeholder="House / Flat No."
                          value={form.houseNumber}
                          onChange={(e) =>
                            setForm({ ...form, houseNumber: e.target.value })
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-brand"
                        />
                        <input
                          placeholder="Apartment / Building (optional)"
                          value={form.apartment}
                          onChange={(e) =>
                            setForm({ ...form, apartment: e.target.value })
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-brand"
                        />
                        <input
                          required
                          placeholder="Area / Street"
                          value={form.area}
                          onChange={(e) =>
                            setForm({ ...form, area: e.target.value })
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-brand sm:col-span-2"
                        />
                        <input
                          placeholder="Landmark (optional)"
                          value={form.landmark}
                          onChange={(e) =>
                            setForm({ ...form, landmark: e.target.value })
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-brand sm:col-span-2"
                        />
                        <input
                          required
                          placeholder="City"
                          value={form.city}
                          onChange={(e) =>
                            setForm({ ...form, city: e.target.value })
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-brand"
                        />
                        <input
                          required
                          placeholder="State"
                          value={form.state}
                          onChange={(e) =>
                            setForm({ ...form, state: e.target.value })
                          }
                          className="rounded-lg border px-3 py-2 outline-none focus:border-brand"
                        />

                        {coords && (
                          <p className="-mt-1 text-xs text-gray-400 sm:col-span-2">
                            Area, city, state &amp; pincode below were filled
                            in automatically — edit any of them if needed.
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isSavingAddress}
                          className="rounded-lg bg-brand py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60 sm:col-span-2"
                        >
                          {isSavingAddress
                            ? "Saving..."
                            : editingAddressId
                            ? "Update Address"
                            : "Save Address"}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Price details */}
            <div className="h-fit rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold text-gray-800">
                Price Details ({items.length} {items.length === 1 ? "Item" : "Items"})
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Product Price</span>
                  <span>+ {formatCurrency(mrpTotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Total Discounts</span>
                    <span>- {formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  {totals.shipping === 0 ? (
                    <span className="font-medium text-success">FREE</span>
                  ) : (
                    <span>+ {formatCurrency(totals.shipping)}</span>
                  )}
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-gray-900">
                  <span>Order Total</span>
                  <span>{formatCurrency(codTotals.payable)}</span>
                </div>
              </div>

              {totalDiscount > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                  <span>✅</span>
                  <span>
                    Yay! Your total discount is {formatCurrency(totalDiscount)}
                  </span>
                </div>
              )}

              <p className="mt-4 text-center text-xs text-gray-400">
                Clicking on &apos;Continue&apos; will not deduct any money
              </p>

              <button
                onClick={handleContinueToPayment}
                className="tap-shrink mt-3 w-full rounded-lg bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === "payment" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-xl border bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-800">
                    Delivery Address
                  </h2>
                  <button
                    onClick={() => setStep("review")}
                    className="text-sm font-medium text-brand hover:underline"
                  >
                    CHANGE
                  </button>
                </div>
                {selectedAddress && (
                  <div className="text-sm">
                    <p className="font-medium text-gray-800">
                      {selectedAddress.fullName} · {selectedAddress.phone}
                    </p>
                    <p className="text-gray-600">
                      {selectedAddress.completeAddress}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-white p-5">
                <p className="mb-3 text-xs font-semibold text-gray-500">
                  Payment Method
                </p>

                <label
                  className={`mt-2 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                    paymentMethod === "RAZORPAY"
                      ? "border-brand bg-brand-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "RAZORPAY"}
                    onChange={() => setPaymentMethod("RAZORPAY")}
                  />
                  <div className="w-16 shrink-0">
                    {prepaidTotals.payable < codTotals.payable && (
                      <p className="text-xs text-gray-400 line-through">
                        {formatCurrency(codTotals.payable)}
                      </p>
                    )}
                    <p className="font-semibold text-green-600">
                      {formatCurrency(prepaidTotals.payable)}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Pay Online</p>
                    <p className="text-xs text-gray-500">
                      UPI, Cards, Netbanking &amp; wallets via Razorpay
                    </p>
                  </div>
                  {prepaidTotals.prepaidDiscount > 0 && (
                    <span className="shrink-0 rounded bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                      Save {formatCurrency(prepaidTotals.prepaidDiscount)}
                    </span>
                  )}
                </label>

                <label
                  className={`mt-2 flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                    !allProductsAllowCOD
                      ? "cursor-not-allowed opacity-50"
                      : paymentMethod === "COD"
                      ? "border-brand bg-brand-50"
                      : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                    disabled={!allProductsAllowCOD}
                  />
                  <span className="w-16 shrink-0 font-semibold text-gray-800">
                    {formatCurrency(codTotals.payable)}
                  </span>
                  <div>
                    <p className="font-medium text-gray-800">
                      Cash on Delivery
                    </p>
                    <p className="text-xs text-gray-500">
                      {allProductsAllowCOD
                        ? "Pay when your order arrives"
                        : "Not available for some products in your cart"}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="h-fit rounded-xl border bg-white p-5">
              <h2 className="mb-4 font-semibold text-gray-800">
                Price Details ({items.length} {items.length === 1 ? "Item" : "Items"})
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Product Price</span>
                  <span>+ {formatCurrency(mrpTotal)}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Total Discounts</span>
                    <span>- {formatCurrency(savings)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  {totals.shipping === 0 ? (
                    <span className="font-medium text-success">FREE</span>
                  ) : (
                    <span>+ {formatCurrency(totals.shipping)}</span>
                  )}
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold text-gray-900">
                  <span>Order Total</span>
                  <span>{formatCurrency(payableAmount)}</span>
                </div>
              </div>

              {savings > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                  <span>✅</span>
                  <span>
                    Yay! Your total discount is {formatCurrency(savings)}
                  </span>
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || !selectedId}
                className="tap-shrink mt-5 w-full rounded-lg bg-brand py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {isPlacingOrder
                  ? "Processing..."
                  : paymentMethod === "RAZORPAY"
                  ? "Pay & Place Order"
                  : "Place Order"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}