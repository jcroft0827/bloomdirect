import { normalizeZip } from "@/lib/delivery/normalizeZip";

export type GeocodeAddressInput = {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
};

export type GeocodedAddress = {
  formattedAddress: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat: number;
  lng: number;
  placeId: string;
};

type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

type GoogleGeocodeResult = {
  formatted_address: string;
  place_id: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: GoogleAddressComponent[];
};

type GoogleGeocodeResponse = {
  status: string;
  results?: GoogleGeocodeResult[];
  error_message?: string;
};

function getAddressComponent(
  components: GoogleAddressComponent[],
  type: string,
  format: "long" | "short" = "long",
) {
  const component = components.find((item) =>
    item.types.includes(type),
  );

  if (!component) {
    return "";
  }

  return format === "short"
    ? component.short_name
    : component.long_name;
}

function buildStreetAddress(components: GoogleAddressComponent[]) {
  const streetNumber = getAddressComponent(
    components,
    "street_number",
  );

  const route = getAddressComponent(components, "route");

  return [streetNumber, route].filter(Boolean).join(" ").trim();
}

export async function geocodeAddress(
  input: GeocodeAddressInput,
): Promise<GeocodedAddress> {
  const apiKey = process.env.GOOGLE_API;

  if (!apiKey) {
    throw new Error(
      "Google geocoding is not configured. GOOGLE_API is missing.",
    );
  }

  const requestedZip = normalizeZip(input.zip);

  const query = [
    input.address1,
    input.address2,
    input.city,
    input.state,
    requestedZip || input.zip,
  ]
    .filter(Boolean)
    .join(", ");

  const params = new URLSearchParams({
    address: query,
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Google geocoding request failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as GoogleGeocodeResponse;

  if (data.status !== "OK" || !data.results?.length) {
    if (data.status === "ZERO_RESULTS") {
      throw new Error(
        "We couldn't find that delivery address. Please check the address and try again.",
      );
    }

    console.error("GOOGLE GEOCODING ERROR:", {
      status: data.status,
      message: data.error_message,
    });

    throw new Error(
      "We couldn't verify that delivery address right now. Please try again.",
    );
  }

  const result = data.results[0];
  const components = result.address_components;

  const zip = normalizeZip(
    getAddressComponent(components, "postal_code"),
  );

  const city =
    getAddressComponent(components, "locality") ||
    getAddressComponent(components, "postal_town") ||
    getAddressComponent(
      components,
      "administrative_area_level_2",
    );

  const state = getAddressComponent(
    components,
    "administrative_area_level_1",
    "short",
  );

  const country = getAddressComponent(
    components,
    "country",
    "short",
  );

  const normalizedStreet =
    buildStreetAddress(components) || input.address1.trim();

  return {
    formattedAddress: result.formatted_address,
    address1: normalizedStreet,
    address2: input.address2?.trim() || "",
    city,
    state,
    zip,
    country,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    placeId: result.place_id,
  };
}