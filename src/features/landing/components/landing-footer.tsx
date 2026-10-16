import { SOURCE_LINKS } from "@/features/landing/links";

const LINKS = [
  { href: SOURCE_LINKS.repository, label: "Source on GitHub" },
  { href: SOURCE_LINKS.architecture, label: "Architecture" },
  { href: SOURCE_LINKS.security, label: "Security" },
  { href: SOURCE_LINKS.decisions, label: "Decisions" },
];

export function LandingFooter() {
  return (
    <footer className="border-t bg-sidebar">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:px-8">
        <nav aria-label="Source and documentation">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex items-center font-medium text-foreground underline-offset-4 hover:underline pointer-coarse:min-h-11"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="max-w-3xl text-pretty">
          Aegir is a portfolio project. It uses synthetic data only and is not a certified maritime safety system; it
          makes no claim of compliance with the ISM Code, SOLAS, flag-state or class requirements.
        </p>
        <p>© 2026 Johnmark Enriquez. All rights reserved.</p>
      </div>
    </footer>
  );
}
