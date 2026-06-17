// app/actions.ts
"use server";

export type GoogleFloristResult = {
  id: string;
  displayName: { text: string };
  nationalPhoneNumber?: string;
  rating?: number;
  formattedAddress: string;
  addressComponents?: any[];
};

export async function searchGoogleFlorists(zipCode: string): Promise<{
  ok: boolean;
  places: GoogleFloristResult[];
  error?: string;
}> {
  try {
    const apiKey = process.env.GOOGLE_API;

    if (!apiKey) {
      console.error("Google Places search failed: Missing GOOGLE_API env var.");
      return {
        ok: false,
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
          textQuery: `florist flower shop near ${zipCode}`,
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

      return {
        ok: false,
        places: [],
        error:
          "Google florist search is temporarily unavailable. You can still enter the florist manually.",
      };
    }

    return {
      ok: true,
      places: data?.places || [],
    };
  } catch (error) {
    console.error("Google Places unexpected error:", error);

    return {
      ok: false,
      places: [],
      error:
        "Google florist search is temporarily unavailable. You can still enter the florist manually.",
    };
  }
}