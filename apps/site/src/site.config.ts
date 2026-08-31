/**
 * Site-wide metadata. Placeholder copy — ported from the legacy zola.toml
 * values as a reasonable default, pending a real editorial pass once the
 * design system lands.
 */
export const siteConfig = {
  title: "Thoughts and Musings",
  description: "Computer science, mathematics, life, and beliefs.",
  baseUrl: "https://andwati.com",
  author: "andwati",
  llmsDescription:
    "Ian Andwati's personal digital-legacy site covering computer science, mathematics, life, and beliefs — writings, portfolio, and a curated bookshelf.",
  nav: [
    { name: "Writings", url: "/writings/" },
    { name: "Portfolio", url: "/portfolio/" },
    { name: "Bookshelf", url: "/bookshelf/" },
    { name: "Blogs", url: "/blogs/" },
  ],
  social: {
    github: "https://github.com/andwati",
    twitter: "https://twitter.com/andwati_",
    youtube: "https://www.youtube.com/@pwnforfunandprofit",
    email: "andwatiian@gmail.com",
  },
  tagDescriptions: {
    linux:
      "Practical notes on running Arch-based Linux distributions, from WiFi hotspot quirks to database setup.",
    "subresource-integrity":
      "How Subresource Integrity (SRI) hashes protect a site from tampered third-party scripts and stylesheets.",
    garuda:
      "Setup notes for Garuda Linux, an Arch-based distribution built for performance.",
    cors: "Notes on Cross-Origin Resource Sharing (CORS) and how browsers enforce cross-origin security policies.",
  } as Record<string, string>,
};
