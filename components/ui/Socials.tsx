/** Figma Frame 2147229914 — LinkedIn 24px + X 21px, 10px gap, bottom-aligned. */

// Fhenix's accounts — the product does not have its own yet, which is why the labels below
// say Fhenix rather than fUSD.
const LINKEDIN_URL = "https://www.linkedin.com/company/fhenix/";
const X_URL = "https://x.com/fhenix";

// Both leave the site, so both need noopener: without it the opened page gets a handle on
// this one through window.opener and can navigate it away.
const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Socials({ className }: { className?: string }) {
  return (
    <div className={`flex items-end gap-[10px] ${className ?? ""}`}>
      <a href={LINKEDIN_URL} aria-label="Fhenix on LinkedIn" className="block" {...EXTERNAL}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/linkedin.svg" alt="" aria-hidden="true" className="size-[24px]" />
      </a>
      <a href={X_URL} aria-label="Fhenix on X" className="block" {...EXTERNAL}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/x.svg" alt="" aria-hidden="true" className="size-[21px]" />
      </a>
    </div>
  );
}
