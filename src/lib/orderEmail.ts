import type { PaymentMethod, PaymentStatus } from "@prisma/client";

import { getMailFrom, sendMail } from "@/lib/mailer";
import { formatCurrency } from "@/lib/utils/currency";

type Money = number | string;

export interface OrderEmailItem {
  productName: string;
  sku?: string | null;
  quantity: number;
  sellingPrice: Money;
  totalAmount: Money;
}

export interface OrderEmailAddress {
  fullName: string;
  phone: string;
  houseNumber: string;
  apartment?: string | null;
  area: string;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;   // ← add karo
  longitude?: number | null;  // ← add karo
}
export interface OrderEmailCustomer {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface OrderEmailPayload {
  id: string;
  invoiceNumber: string;
  placedAt: Date;
  subtotal: Money;
  shippingCharge: Money;
  discountAmount: Money;
  totalAmount: Money;
  paymentStatus: PaymentStatus;
  items: OrderEmailItem[];
  address: OrderEmailAddress;
  customer: OrderEmailCustomer;
  paymentMethod: PaymentMethod | null;
  geo?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
    ip?: string | null;
  };
}

export interface CancelEmailPayload {
  id: string;
  invoiceNumber: string;
  cancelledAt: Date;
  totalAmount: Money;
  items: OrderEmailItem[];
  address: OrderEmailAddress;
  customer: OrderEmailCustomer;
  cancelReason?: string | null;
  paymentStatus: PaymentStatus;
  geo?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
    ip?: string | null;
  };
}

const BRAND = "#d6266f";
const BRAND_DARK = "#a3184f";
const CANCEL_COLOR = "#dc2626";
const CANCEL_DARK = "#991b1b";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatIst(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function formatAddress(address: OrderEmailAddress): string {
  return [
    address.houseNumber,
    address.apartment,
    address.area,
    address.landmark ? `Near ${address.landmark}` : null,
    `${address.city}, ${address.state} ${address.pincode}`,
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
}

function googleMapsLink(address: OrderEmailAddress): string {
  if (address.latitude && address.longitude) {
    return `https://www.google.com/maps?q=${address.latitude},${address.longitude}`;
  }
  const query = encodeURIComponent(
    [address.houseNumber, address.area, address.city, address.state, address.pincode, "India"]
      .filter(Boolean).join(", ")
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function customerName(customer: OrderEmailCustomer): string {
  const name = [customer.firstName, customer.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ");
  return name || "Not provided";
}

interface Badge {
  label: string;
  background: string;
  color: string;
}

function paymentMethodBadge(method: PaymentMethod | null): Badge {
  if (method === "COD") {
    return { label: "🟡 Cash on Delivery", background: "#fef3c7", color: "#92400e" };
  }
  if (method === "RAZORPAY" || method === "UPI") {
    return { label: "✅ Paid Online", background: "#dcfce7", color: "#166534" };
  }
  return { label: "Payment method unknown", background: "#f3f4f6", color: "#4b5563" };
}

function paymentStatusBadge(status: PaymentStatus): Badge {
  switch (status) {
    case "PAID":
      return { label: "Paid", background: "#dcfce7", color: "#166534" };
    case "FAILED":
      return { label: "Failed", background: "#fee2e2", color: "#991b1b" };
    case "REFUNDED":
      return { label: "Refunded", background: "#e0e7ff", color: "#3730a3" };
    case "PARTIALLY_REFUNDED":
      return { label: "Partially refunded", background: "#e0e7ff", color: "#3730a3" };
    default:
      return { label: "Pending", background: "#fef3c7", color: "#92400e" };
  }
}

function renderBadge(badge: Badge): string {
  return (
    `<span style="display:inline-block;padding:4px 10px;border-radius:999px;` +
    `background:${badge.background};color:${badge.color};font-size:13px;font-weight:600;">` +
    `${escapeHtml(badge.label)}</span>`
  );
}

function renderRow(label: string, value: string, bold = false): string {
  const weight = bold ? "700" : "400";
  const size = bold ? "16px" : "14px";
  return (
    `<tr>` +
    `<td style="padding:6px 0;color:#4b5563;font-size:${size};">${escapeHtml(label)}</td>` +
    `<td align="right" style="padding:6px 0;color:#111827;font-size:${size};font-weight:${weight};">${value}</td>` +
    `</tr>`
  );
}

function renderItems(items: OrderEmailItem[]): string {
  return items
    .map((item) => {
      const sku = item.sku
        ? `<br /><span style="color:#9ca3af;font-size:12px;">SKU: ${escapeHtml(item.sku)}</span>`
        : "";
      return (
        `<tr>` +
        `<td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;">` +
        `${escapeHtml(item.productName)}${sku}</td>` +
        `<td align="center" style="padding:10px 8px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#4b5563;">` +
        `${item.quantity}</td>` +
        `<td align="right" style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#111827;white-space:nowrap;">` +
        `${escapeHtml(formatCurrency(Number(item.totalAmount)))}` +
        `<br /><span style="color:#9ca3af;font-size:12px;">${escapeHtml(formatCurrency(Number(item.sellingPrice)))} each</span>` +
        `</td>` +
        `</tr>`
      );
    })
    .join("");
}

function renderGeo(geo?: OrderEmailPayload["geo"]): string {
  if (!geo || (!geo.city && !geo.region && !geo.country && !geo.ip)) return "";

  const location = [geo.city, geo.region, geo.country]
    .filter(Boolean)
    .join(", ");

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="margin-top:16px;background:#f0f9ff;border-radius:8px;padding:12px 16px;">
<tr>
  <td>
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#0369a1;font-weight:600;margin-bottom:6px;">
      📍 Order placed from
    </div>
    ${location ? `<div style="font-size:13px;color:#0c4a6e;">${escapeHtml(location)}</div>` : ""}
    ${geo.ip ? `<div style="font-size:12px;color:#7dd3fc;margin-top:2px;">IP: ${escapeHtml(geo.ip)}</div>` : ""}
  </td>
</tr>
</table>`;
}

function buildHtml(order: OrderEmailPayload): string {
  const methodBadge = paymentMethodBadge(order.paymentMethod);
  const statusBadge = paymentStatusBadge(order.paymentStatus);
  const discount = Number(order.discountAmount);
  const shipping = Number(order.shippingCharge);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>New order ${escapeHtml(order.invoiceNumber)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<tr>
<td style="background:linear-gradient(135deg,${BRAND} 0%,${BRAND_DARK} 100%);padding:24px;text-align:center;">
<div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Shopka</div>
<div style="margin-top:4px;font-size:14px;color:rgba(255,255,255,0.85);">New order received</div>
</td>
</tr>

<tr>
<td style="padding:24px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;padding:16px;">
<tr><td>
<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Order</div>
<div style="margin-top:4px;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(order.invoiceNumber)}</div>
<div style="margin-top:2px;font-size:13px;color:#6b7280;">${escapeHtml(formatIst(order.placedAt))} IST</div>
<div style="margin-top:10px;">${renderBadge(methodBadge)}&nbsp;${renderBadge(statusBadge)}</div>
</td></tr>
</table>

${renderGeo(order.geo)}

<div style="margin-top:22px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Customer</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
${renderRow("Name", escapeHtml(customerName(order.customer)))}
${renderRow("Phone", escapeHtml(order.customer.phone ?? order.address.phone))}
${renderRow("Email", escapeHtml(order.customer.email ?? "Not provided"))}
</table>

<div style="margin-top:22px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Deliver to</div>
<div style="margin-top:8px;font-size:14px;line-height:1.6;color:#111827;">
<strong>${escapeHtml(order.address.fullName)}</strong><br />
${escapeHtml(formatAddress(order.address))}<br />
<span style="color:#4b5563;">${escapeHtml(order.address.phone)}</span><br />
<a href="${googleMapsLink(order.address)}" style="display:inline-block;margin-top:8px;padding:6px 14px;background:#1a73e8;color:#fff;border-radius:6px;font-size:13px;text-decoration:none;">📍 View on Google Maps</a>
</div>

<div style="margin-top:22px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Items</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr>
<th align="left" style="padding-bottom:6px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">Product</th>
<th align="center" style="padding-bottom:6px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">Qty</th>
<th align="right" style="padding-bottom:6px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">Amount</th>
</tr>
${renderItems(order.items)}
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
${renderRow("Subtotal", escapeHtml(formatCurrency(Number(order.subtotal))))}
${discount > 0 ? renderRow("Customer savings", `&minus;${escapeHtml(formatCurrency(discount))}`) : ""}
${renderRow("Delivery", shipping > 0 ? escapeHtml(formatCurrency(shipping)) : '<span style="color:#16a34a;font-weight:600;">FREE</span>')}
<tr><td colspan="2" style="padding:8px 0 0;border-top:2px solid #e5e7eb;"></td></tr>
${renderRow("Total", escapeHtml(formatCurrency(Number(order.totalAmount))), true)}
</table>

</td>
</tr>

<tr>
<td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;font-size:12px;color:#9ca3af;">
Automated notification from shopka.in &middot; Order ID ${escapeHtml(order.id)}
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildCancelHtml(order: CancelEmailPayload): string {
  const statusBadge = paymentStatusBadge(order.paymentStatus);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Order Cancelled ${escapeHtml(order.invoiceNumber)}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

<tr>
<td style="background:linear-gradient(135deg,${CANCEL_COLOR} 0%,${CANCEL_DARK} 100%);padding:24px;text-align:center;">
<div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Shopka</div>
<div style="margin-top:4px;font-size:14px;color:rgba(255,255,255,0.85);">❌ Order Cancelled</div>
</td>
</tr>

<tr>
<td style="padding:24px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:12px;padding:16px;">
<tr><td>
<div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#991b1b;font-weight:600;">Cancelled Order</div>
<div style="margin-top:4px;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(order.invoiceNumber)}</div>
<div style="margin-top:2px;font-size:13px;color:#6b7280;">Cancelled at ${escapeHtml(formatIst(order.cancelledAt))} IST</div>
<div style="margin-top:10px;">${renderBadge(statusBadge)}</div>
${order.cancelReason ? `<div style="margin-top:10px;font-size:13px;color:#991b1b;"><strong>Reason:</strong> ${escapeHtml(order.cancelReason)}</div>` : ""}
</td></tr>
</table>

${renderGeo(order.geo)}

<div style="margin-top:22px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Customer</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
${renderRow("Name", escapeHtml(customerName(order.customer)))}
${renderRow("Phone", escapeHtml(order.customer.phone ?? order.address.phone))}
${renderRow("Email", escapeHtml(order.customer.email ?? "Not provided"))}
</table>

<div style="margin-top:22px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Was to be delivered at</div>
<div style="margin-top:8px;font-size:14px;line-height:1.6;color:#111827;">
<strong>${escapeHtml(order.address.fullName)}</strong><br />
${escapeHtml(formatAddress(order.address))}<br />
<span style="color:#4b5563;">${escapeHtml(order.address.phone)}</span><br />
<a href="${googleMapsLink(order.address)}" style="display:inline-block;margin-top:8px;padding:6px 14px;background:#1a73e8;color:#fff;border-radius:6px;font-size:13px;text-decoration:none;">📍 View on Google Maps</a>
</div>

<div style="margin-top:22px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;font-weight:600;">Cancelled Items</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
<tr>
<th align="left" style="padding-bottom:6px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">Product</th>
<th align="center" style="padding-bottom:6px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">Qty</th>
<th align="right" style="padding-bottom:6px;border-bottom:2px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">Amount</th>
</tr>
${renderItems(order.items)}
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
${renderRow("Order Total", escapeHtml(formatCurrency(Number(order.totalAmount))), true)}
</table>

</td>
</tr>

<tr>
<td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;font-size:12px;color:#9ca3af;">
Automated notification from shopka.in &middot; Order ID ${escapeHtml(order.id)}
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildText(order: OrderEmailPayload): string {
  const lines = order.items.map(
    (item) => `  - ${item.productName} x${item.quantity} — ${formatCurrency(Number(item.totalAmount))}`
  );
  const geo = order.geo;
  const location = geo ? [geo.city, geo.region, geo.country].filter(Boolean).join(", ") : null;

  return [
    `New order: ${order.invoiceNumber}`,
    `Placed: ${formatIst(order.placedAt)} IST`,
    location ? `Location: ${location}` : null,
    geo?.ip ? `IP: ${geo.ip}` : null,
    ``,
    `Customer: ${customerName(order.customer)}`,
    `Phone: ${order.customer.phone ?? order.address.phone}`,
    `Email: ${order.customer.email ?? "Not provided"}`,
    ``,
    `Deliver to: ${order.address.fullName}`,
    formatAddress(order.address),
    `Maps: ${googleMapsLink(order.address)}`,
    ``,
    `Items:`,
    ...lines,
    ``,
    `Subtotal: ${formatCurrency(Number(order.subtotal))}`,
    `Delivery: ${Number(order.shippingCharge) > 0 ? formatCurrency(Number(order.shippingCharge)) : "FREE"}`,
    `Total: ${formatCurrency(Number(order.totalAmount))}`,
    ``,
    `Payment: ${paymentMethodBadge(order.paymentMethod).label} (${paymentStatusBadge(order.paymentStatus).label})`,
    `Order ID: ${order.id}`,
  ].filter((l): l is string => l !== null).join("\n");
}

function buildCancelText(order: CancelEmailPayload): string {
  const lines = order.items.map(
    (item) => `  - ${item.productName} x${item.quantity}`
  );
  const geo = order.geo;
  const location = geo ? [geo.city, geo.region, geo.country].filter(Boolean).join(", ") : null;

  return [
    `Order CANCELLED: ${order.invoiceNumber}`,
    `Cancelled at: ${formatIst(order.cancelledAt)} IST`,
    order.cancelReason ? `Reason: ${order.cancelReason}` : null,
    location ? `Location: ${location}` : null,
    geo?.ip ? `IP: ${geo.ip}` : null,
    ``,
    `Customer: ${customerName(order.customer)}`,
    `Phone: ${order.customer.phone ?? order.address.phone}`,
    `Email: ${order.customer.email ?? "Not provided"}`,
    ``,
    `Items:`,
    ...lines,
    ``,
    `Order Total: ${formatCurrency(Number(order.totalAmount))}`,
    `Payment Status: ${paymentStatusBadge(order.paymentStatus).label}`,
    `Order ID: ${order.id}`,
  ].filter((l): l is string => l !== null).join("\n");
}

export async function sendOrderNotification(order: OrderEmailPayload): Promise<boolean> {
  const recipient = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  const from = getMailFrom();

  if (!from) {
    console.warn(`[orderEmail] Resend not configured — skipping alert for ${order.invoiceNumber}`);
    return false;
  }

  if (!recipient) {
    console.warn(`[orderEmail] ORDER_NOTIFICATION_EMAIL not set — skipping alert for ${order.invoiceNumber}`);
    return false;
  }

  try {
    await sendMail({
      from: `"Shopka Orders" <${from}>`,
      to: recipient,
      replyTo: order.customer.email ?? undefined,
      subject: `New order ${order.invoiceNumber} — ${formatCurrency(Number(order.totalAmount))} (${order.paymentMethod === "COD" ? "COD" : "Prepaid"})`,
      text: buildText(order),
      html: buildHtml(order),
    });
    return true;
  } catch (error) {
    console.error(`[orderEmail] failed to send alert for ${order.invoiceNumber}:`, error);
    return false;
  }
}

export async function sendCancelNotification(order: CancelEmailPayload): Promise<boolean> {
  const recipient = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  const from = getMailFrom();

  if (!from || !recipient) return false;

  try {
    await sendMail({
      from: `"Shopka Orders" <${from}>`,
      to: recipient,
      replyTo: order.customer.email ?? undefined,
      subject: `❌ Order ${order.invoiceNumber} cancelled — ${formatCurrency(Number(order.totalAmount))}`,
      text: buildCancelText(order),
      html: buildCancelHtml(order),
    });
    return true;
  } catch (error) {
    console.error(`[orderEmail] failed to send cancel alert for ${order.invoiceNumber}:`, error);
    return false;
  }
}