"use client";

import { motion, type Variants } from "framer-motion";

/**
 * "Software has modes. Money never got one" that dissolves one character at a time,
 * left→right, when `play` flips true (§A3: opacity→0, translateY −8px, slight blur; 80ms
 * per char, 20ms stagger). Every character animates individually — never whole words.
 *
 * Words are inline-block wrappers so the line still wraps normally; characters carry an
 * exact per-index delay for a uniform L→R sweep. The full text lives on the h2's aria-label
 * (visual spans are aria-hidden) so screen readers always get the headline, dissolved or not.
 */
const WORDS: { text: string; italic?: boolean }[] = [
  { text: "Software" },
  { text: "has" },
  { text: "modes." },
  { text: "Money", italic: true },
  { text: "never" },
  { text: "got" },
  { text: "one" },
];

// Precompute per-character dissolve delays at module load (exact 20ms L→R stagger across
// the whole line) so nothing mutates during render.
const WORD_CHARS: { italic?: boolean; chars: { ch: string; delay: number }[] }[] = (() => {
  let idx = 0;
  return WORDS.map((word) => ({
    italic: word.italic,
    chars: word.text.split("").map((ch) => ({ ch, delay: idx++ * 0.02 })),
  }));
})();

const CHAR: Variants = {
  // reforms L→R when the toggle goes OFF…
  shown: (delay: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.3, delay, ease: "easeOut" },
  }),
  // …and dissolves L→R when it goes ON
  gone: (delay: number) => ({
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: { duration: 0.08, delay, ease: "easeOut" },
  }),
};

export default function DissolveHeadline({
  play,
  className,
  style,
}: {
  play: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <h2 className={className} style={style} aria-label="Software has modes. Money never got one">
      <span aria-hidden="true">
        {WORD_CHARS.map((word, wi) => (
          <span key={wi}>
            <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>
              {word.chars.map((c, ci) => (
                <motion.span
                  key={ci}
                  className={word.italic ? "font-serif italic" : undefined}
                  style={{ display: "inline-block" }}
                  variants={CHAR}
                  custom={c.delay}
                  initial="shown"
                  animate={play ? "gone" : "shown"}
                >
                  {c.ch}
                </motion.span>
              ))}
            </span>
            {wi < WORD_CHARS.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </h2>
  );
}
