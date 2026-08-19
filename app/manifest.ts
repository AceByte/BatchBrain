import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return { name: "BatchBrain", short_name: "BatchBrain", description: "Premix stock and cocktail specs", start_url: "/", display: "standalone", background_color: "#0f1115", theme_color: "#0f1115", icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }] }
}
