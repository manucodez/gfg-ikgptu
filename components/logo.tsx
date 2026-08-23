/**
 * The GFG Campus Chapter, IKGPTU logo — official artwork.
 *
 * This renders the real exported logo image (public/brand/) rather than
 * a hand-vectorized recreation. Each component ships a light-mode and a
 * dark-mode asset (navy -> white, green unchanged) and swaps between them
 * with Tailwind's `dark:` visibility utilities, matching the color
 * response the site previously did in-SVG.
 *
 * Two components are exported:
 * - `LogoMark`: the graphic mark only (cap + eyes + nose), for compact
 *   spots -- navbar, footer, dashboard headers.
 * - `Logo`: the full lockup (mark + wordmark), for larger, spacious
 *   placements like the login-style pages.
 */

export function LogoMark({ className }: { className?: string }) {
  return (
    <>
      <img
        src="/brand/logo-mark.png"
        alt=""
        aria-hidden="true"
        className={`${className ?? ""} dark:hidden`}
      />
      <img
        src="/brand/logo-mark-dark.png"
        alt=""
        aria-hidden="true"
        className={`${className ?? ""} hidden dark:block`}
      />
    </>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <>
      <img
        src="/brand/logo-full.png"
        alt="GFG Campus Chapter, IKGPTU logo"
        className={`${className ?? ""} dark:hidden`}
      />
      <img
        src="/brand/logo-full-dark.png"
        alt="GFG Campus Chapter, IKGPTU logo"
        className={`${className ?? ""} hidden dark:block`}
      />
    </>
  );
}
