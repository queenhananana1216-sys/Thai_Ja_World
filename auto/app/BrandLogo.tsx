/** 링크정거장 — 정류장(플랫폼) + 정차(링크 한 점) 모티프 */
export function BrandLogo() {
  return (
    <svg
      className="brand-logo-svg"
      width={52}
      height={52}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="brandLogoGrad" x1="8" y1="6" x2="46" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c4b5fd" />
          <stop offset="0.5" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="40" height="40" rx="14" fill="rgba(255,255,255,0.04)" stroke="url(#brandLogoGrad)" strokeWidth="1.25" />
      <path
        d="M14 34h24v4a2 2 0 01-2 2H16a2 2 0 01-2-2v-4z"
        fill="url(#brandLogoGrad)"
        opacity="0.85"
      />
      <circle cx="26" cy="22" r="5.5" stroke="url(#brandLogoGrad)" strokeWidth="2.25" fill="none" />
      <circle cx="26" cy="22" r="2" fill="url(#brandLogoGrad)" />
    </svg>
  );
}
