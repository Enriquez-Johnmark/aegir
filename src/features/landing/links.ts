const REPOSITORY = "https://github.com/Enriquez-Johnmark/aegir";

export const SOURCE_LINKS = {
  repository: REPOSITORY,
  readme: `${REPOSITORY}#readme`,
  architecture: `${REPOSITORY}/blob/main/docs/ARCHITECTURE.md`,
  security: `${REPOSITORY}/blob/main/docs/SECURITY.md`,
  testing: `${REPOSITORY}/blob/main/docs/TESTING.md`,
  decisions: `${REPOSITORY}/blob/main/docs/DECISIONS.md`,
} as const;

/** In-page sections, shared by the header and the sections themselves. */
export const SECTION_IDS = {
  howItWorks: "how-it-works",
  trust: "why-trust-it",
  demo: "try-the-demo",
} as const;
