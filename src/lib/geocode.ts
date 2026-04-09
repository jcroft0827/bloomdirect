import axios from "axios";

export async function geoCodeAddress(address: string) {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: address,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "bloomdirect-app",
        },
      }
    );

    if (!response.data || response.data.length === 0) {
      return null;
    }

    const { lat, lon } = response.data[0];

    return {
      type: "Point",
      coordinates: [parseFloat(lon), parseFloat(lat)],
    };
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
}