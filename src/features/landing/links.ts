const REPOSITORY = "https://github.com/Enriquez-Johnmark/aegir";
const BLOB = `${REPOSITORY}/blob/main`;

/** A file in the repository on GitHub, e.g. `blobUrl("docs/TESTING.md")`. */
export const blobUrl = (path: string) => `${BLOB}/${path}`;

export const SOURCE_LINKS = {
  repository: REPOSITORY,
  readme: `${REPOSITORY}#readme`,
  architecture: `${BLOB}/docs/ARCHITECTURE.md`,
  security: `${BLOB}/docs/SECURITY.md`,
  testing: `${BLOB}/docs/TESTING.md`,
  decisions: `${BLOB}/docs/DECISIONS.md`,
  ci: `${REPOSITORY}/actions/workflows/ci.yml`,
} as const;

/**
 * The person behind the project, for visitors who are hiring (D-050). Only what the
 * owner chose to publish: no email address on the page.
 */
export const AUTHOR = {
  name: "Johnmark Enriquez",
  title: "Full-stack engineer",
  github: "https://github.com/Enriquez-Johnmark",
  linkedin: "https://www.linkedin.com/in/johnmark-enriquez/",
} as const;

/** The engineering page: how it's built and who built it (D-051). */
export const ENGINEERING_PATH = "/engineering";

/** Sections on `/` and on the engineering page, shared by the header and the sections themselves. */
export const SECTION_IDS = {
  howItWorks: "how-it-works",
  roles: "who-uses-it",
  trust: "why-trust-it",
  scope: "what-it-replaces",
  demo: "try-the-demo",
  contact: "for-your-fleet",
  guarantees: "guarantees",
  built: "how-its-built",
  author: "built-by",
} as const;
