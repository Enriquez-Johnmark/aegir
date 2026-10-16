import { vi } from "vitest";

import { cookieJar } from "./session";

// Next's request-scoped APIs need a request; these stand in for it (D-049).
// Everything else runs for real: actions, the data layer, `requireUser`,
// `createClient` and `redirect` (which throws its usual NEXT_REDIRECT error).
vi.mock("next/headers", () => ({ cookies: async () => cookieJar() }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
