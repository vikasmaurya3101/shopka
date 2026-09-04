import { NextRequest, NextResponse } from "next/server";

/**
 * Reverse-geocodes GPS coordinates into an address (city, state, pincode,
 * area) using OpenStreetMap's free Nominatim API. Called server-side
 * (rather than directly from the browser) so we can set a proper
 * User-Agent identifying the app, as Nominatim's usage policy requires.
 */
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json(
      { success: false, message: "lat and lng are required." },
      { status: 400 }
    );
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lng);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Shopka/1.0 (contact: contact@shopka.in)",
        "Accept-Language": "en",
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim returned ${res.status}`);
    }

    const data = await res.json();
    const address = data.address ?? {};

    return NextResponse.json({
      success: true,
      data: {
        area:
          address.suburb ||
          address.neighbourhood ||
          address.road ||
          address.village ||
          "",
        city:
          address.city ||
          address.town ||
          address.municipality ||
          address.county ||
          "",
        state: address.state || "",
        pincode: address.postcode || "",
      },
    });
  } catch (error) {
    console.error("Reverse geocode error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to detect address from location." },
      { status: 500 }
    );
  }
}
