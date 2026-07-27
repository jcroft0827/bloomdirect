import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GetBloomDirect",
    short_name: "GetBloomDirect",
    description:
      "The fee-free florist-to-florist order network built for independent florists.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#7c3aed",
    orientation: "portrait-primary",
    lang: "en-US",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}