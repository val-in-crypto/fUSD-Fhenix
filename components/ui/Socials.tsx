/** Figma Frame 2147229914 — LinkedIn 24px + X 21px, 10px gap, bottom-aligned. */
export default function Socials({ className }: { className?: string }) {
  return (
    <div className={`flex items-end gap-[10px] ${className ?? ""}`}>
      <a href="#" aria-label="fUSD on LinkedIn" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/linkedin.svg" alt="" aria-hidden="true" className="size-[24px]" />
      </a>
      <a href="#" aria-label="fUSD on X" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/x.svg" alt="" aria-hidden="true" className="size-[21px]" />
      </a>
    </div>
  );
}
