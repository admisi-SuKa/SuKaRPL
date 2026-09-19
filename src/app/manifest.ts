import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SuKaRPL - Rekognisi Pembelajaran Lampau",
    short_name: "SuKaRPL",
    description: "Portal RPL UIN Sunan Kalijaga",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f8f7",
    theme_color: "#075b52",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
