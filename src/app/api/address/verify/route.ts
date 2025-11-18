// src/app/api/address/verify/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { street = "", city = "", state = "", zip = "" } = body;

  // YOUR REAL USERID — CONFIRMED WORKING
  const USERID = "8W271BLOOM069";

  const xmlRequest = `<AddressValidateRequest USERID="${USERID}">
    <Address ID="0">
      <Address1></Address1>
      <Address2>${street.trim()}</Address2>
      <City>${city}</City>
      <State>${state}</State>
      <Zip5>${zip}</Zip5>
      <Zip4></Zip4>
    </Address>
  </AddressValidateRequest>`;

  try {
    const response = await fetch(
      `https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&XML=${encodeURIComponent(xmlRequest)}`
    );

    const text = await response.text();
    console.log("USPS Raw Response:", text); // ← CHECK THIS IN TERMINAL

    // If USPS returns an error (most common issue)
    if (text.includes("<Error>")) {
      const desc = text.match(/<Description>(.*?)<\/Description>/)?.[1] || "Unknown error";
      console.log("USPS Error:", desc);
      return NextResponse.json({ suggestions: [] });
    }

    // Extract corrected address
    const address2 = text.match(/<Address2>(.*?)<\/Address2>/)?.[1]?.trim() || street;
    const cityOut = text.match(/<City>(.*?)<\/City>/)?.[1]?.trim() || city;
    const stateOut = text.match(/<State>(.*?)<\/State>/)?.[1]?.trim() || state;
    const zip5 = text.match(/<Zip5>(.*?)<\/Zip5>/)?.[1]?.trim() || zip;
    const zip4 = text.match(/<Zip4>(.*?)<\/Zip4>/)?.[1]?.trim() || "";

    // Only suggest if USPS actually changed something
    const original = `${street} ${city} ${state}`.toLowerCase().trim();
    const corrected = `${address2} ${cityOut} ${stateOut}`.toLowerCase().trim();

    if (original !== corrected) {
      return NextResponse.json({
        suggestions: [{
          street: address2,
          city: cityOut,
          state: stateOut,
          zip: zip5,
        }],
      });
    }

    return NextResponse.json({ suggestions: [] });
  } catch (err: any) {
    console.error("Fetch error:", err.message);
    return NextResponse.json({ suggestions: [] });
  }
}