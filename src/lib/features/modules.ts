export const MODULES = [
  {
    key: "gig_details",
    label: "Gig details",
    description: "Load-in and soundcheck times for gigs",
  },
  {
    key: "bring_items",
    label: "Who brings what",
    description: "A shared checklist per event",
  },
  { key: "setlists", label: "Setlists", description: "Coming in Phase 3" },
  {
    key: "song_wishlist",
    label: "Song wishlist",
    description: "Coming in Phase 3",
  },
  {
    key: "rotating_location",
    label: "Rotating location",
    description: "Coming soon",
  },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
