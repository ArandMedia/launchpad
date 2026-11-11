import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LaunchPAD",
    short_name: "LaunchPAD",
    description: "ArandMedia internal + client project hub",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#7c3aed",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
