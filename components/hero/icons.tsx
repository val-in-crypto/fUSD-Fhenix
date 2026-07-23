import type { CSSProperties } from "react";

type IconProps = { className?: string; style?: CSSProperties };

/** pixel:arrow-down (Figma 42:49). Uses currentColor. */
export function ArrowDown({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M15.3333 8V8.66667H14.6667V9.33333H14V10H13.3333V10.6667H12.6667V11.3333H12V12H11.3333V12.6667H10.6667V13.3333H10V14H9.33333V14.6667H8.66667V15.3333H7.33333V14.6667H6.66667V14H6V13.3333H5.33333V12.6667H4.66667V12H4V11.3333H3.33333V10.6667H2.66667V10H2V9.33333H1.33333V8.66667H0.666667V8H1.33333V7.33333H2V8H2.66667V8.66667H3.33333V9.33333H4V10H4.66667V10.6667H5.33333V11.3333H6V12H6.66667V12.6667H7.33333V0.666667H8.66667V12.6667H9.33333V12H10V11.3333H10.6667V10.6667H11.3333V10H12V9.33333H12.6667V8.66667H13.3333V8H14V7.33333H14.6667V8H15.3333Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** proicons:arrow-enter (Figma 42:53). Uses currentColor. */
export function ArrowEnter({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M16.4583 4.68583V7.93333C16.4583 8.81739 16.1071 9.66523 15.482 10.2904C14.8569 10.9155 14.0091 11.2667 13.125 11.2667H3.22583M6.75583 15.3142L3.59167 12.15C3.47546 12.0339 3.38327 11.8961 3.32035 11.7444C3.25744 11.5927 3.22504 11.4301 3.225 11.2658M6.755 7.21833L3.59167 10.3833C3.3475 10.6275 3.225 10.9475 3.225 11.2675"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}
