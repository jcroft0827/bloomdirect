"use server";

import { connectToDB } from "@/lib/mongoose";
import GoogleSearchCache from "@/models/GoogleSearchCache";

type CachedGoogleSearch = {
  results: {
    googlePlaceId?: string;
    name?: string;
    phone?: string;
    formattedAddress?: string;
    rating?: number | null;
    addressComponents?: any[];
  }[];
};

export async function searchGoogleFlorists(zipCode: string) {
  try {
    await connectToDB();

    const zip = zipCode.trim();
    const query = `florist flower shop near ${zip}`;

    const cached = (await GoogleSearchCache.findOne({
      zip,
      expiresAt: { $gt: new Date() },
    }).lean()) as CachedGoogleSearch | null;



    if (cached) {
      return {
        ok: true,
        source: "cache",
        places: cached.results.map((place: any) => ({
          id: place.googlePlaceId,
          displayName: { text: place.name },
          nationalPhoneNumber: place.phone,
          formattedAddress: place.formattedAddress,
          rating: place.rating,
          addressComponents: place.addressComponents || [],
        })),
      };
    }

    const apiKey = process.env.GOOGLE_API;

    if (!apiKey) {
      console.error("Google Places search failed: Missing GOOGLE_API env var.");
      return {
        ok: false,
        source: "google",
        places: [],
        error: "Google search is not configured.",
      };
    }

    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.nationalPhoneNumber,places.rating",
        },
        body: JSON.stringify({
          textQuery: query,
        }),
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Google Places search failed:", {
        status: response.status,
        statusText: response.statusText,
        message: data?.error?.message,
        details: data?.error,
      });

      const staleCache = (await GoogleSearchCache.findOne({ zip })
        .sort({ updatedAt: -1 })
        .lean()) as CachedGoogleSearch | null;

      if (staleCache) {
        return {
          ok: true,
          source: "stale_cache",
          places: staleCache.results.map((place: any) => ({
            id: place.googlePlaceId,
            displayName: { text: place.name },
            nationalPhoneNumber: place.phone,
            formattedAddress: place.formattedAddress,
            rating: place.rating,
            addressComponents: place.addressComponents || [],
          })),
          warning:
            "Google search is temporarily unavailable, so cached results are being shown.",
        };
      }

      return {
        ok: false,
        source: "google",
        places: [],
        error:
          "Google florist search is temporarily unavailable. You can still enter the florist manually.",
      };
    }

    const places = data?.places || [];

    await GoogleSearchCache.findOneAndUpdate(
      { zip },
      {
        $set: {
          zip,
          query,
          results: places.map((place: any) => ({
            googlePlaceId: place.id || "",
            name: place.displayName?.text || "",
            phone: place.nationalPhoneNumber || "",
            formattedAddress: place.formattedAddress || "",
            rating: place.rating ?? null,
            addressComponents: place.addressComponents || [],
          })),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      { upsert: true, new: true },
    );

    return {
      ok: true,
      source: "google",
      places,
    };
  } catch (error) {
    console.error("Google florist search unexpected error:", error);

    return {
      ok: false,
      source: "server",
      places: [],
      error:
        "Google florist search is temporarily unavailable. You can still enter the florist manually.",
    };
  }
}