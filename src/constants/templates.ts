export const TEMPLATES = [
  {
    key: "band",
    label: "Band",
    description: "Fixed line-up, rehearsals and gigs",
  },
  {
    key: "jam",
    label: "Jam group",
    description: "Friends who jam, changing attendance",
  },
  {
    key: "project",
    label: "Project",
    description: "Teaming up for one performance",
  },
] as const;

export type TemplateKey = (typeof TEMPLATES)[number]["key"];
