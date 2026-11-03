import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "homemart4u — Fresh Chicken & Farm Eggs Mulbagal",
    short_name: "homemart4u",
    description: "Farm-fresh chicken and quality eggs delivered to your door in Mulbagal with Cash on Delivery.",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1917",
    theme_color: "#e11d48",
    orientation: "portrait",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
