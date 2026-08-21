/** Figma Frame 2147229914 — LinkedIn 24px + X 21px, 10px gap.
 *
 * Centre-aligned, not bottom-aligned as the frame reads. The two SVGs carry very different
 * padding inside their viewBoxes — LinkedIn's mark fills 74.9% of its box, X's fills 87.5% —
 * so aligning the boxes' bottoms left the marks themselves 1.69px out, which is visible at this
 * size. Both marks are centred within their own viewBox, so centring the boxes lands their
 * centres together.
 *
 * The box sizes stay 24 and 21: they put the two marks within 0.4px of the same ink height
 * (17.98 against 18.38), which is what the pairing is for.
 */

// Fhenix's accounts — the product does not have its own yet, which is why the labels below
// say Fhenix rather than fUSD.
const LINKEDIN_URL = "https://www.linkedin.com/company/fhenix/";
const X_URL = "https://x.com/fhenix";

// Both leave the site, so both need noopener: without it the opened page gets a handle on
// this one through window.opener and can navigate it away.
const EXTERNAL = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Socials({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-[10px] ${className ?? ""}`}>
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
