// app/actions.ts
"use server";

export async function searchGoogleFlorists(zipCode: string) {
  const apiKey = process.env.GOOGLE_API;
  const url = "https://places.googleapis.com/v1/places:searchText";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey || "",
      // Field Mask specifies exactly what to return (Name, Phone, Rating, Photos)
      "X-Goog-FieldMask":
        "places.displayName,places.formattedAddress,places.addressComponents,places.nationalPhoneNumber,places.rating,places.id",
    },
    body: JSON.stringify({
      textQuery: `florists in ${zipCode}`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Google Search Failed");
  }

  const data = await response.json();
  return data.places || [];
}
