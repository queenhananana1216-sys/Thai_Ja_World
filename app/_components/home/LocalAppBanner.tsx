type LocalAppBannerTone = 'mobility' | 'delivery' | 'bolt' | 'lineman';

type LocalAppBannerProps = {
  tone: LocalAppBannerTone;
  title: string;
  subtitle: string;
  cta: string;
  badge: string;
  detailBadge?: string;
  chips?: string[];
  href?: string;
};

export default function LocalAppBanner({
  tone,
  title,
  subtitle,
  cta,
  badge,
  detailBadge,
  chips = [],
  href = '#',
}: LocalAppBannerProps) {
  const safeHref = href?.trim() ? href : '#';
  return (
    <a
      href={safeHref}
      className={`local-app-banner local-app-banner--${tone}`}
      aria-label={`${title} - ${cta}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="local-app-banner__glow" aria-hidden />
      <span className="local-app-banner__badge-row">
        <span className="local-app-banner__badge">{badge}</span>
        {detailBadge ? <span className="local-app-banner__detail">{detailBadge}</span> : null}
      </span>
      <strong className="local-app-banner__title">{title}</strong>
      <span className="local-app-banner__subtitle">{subtitle}</span>
      {chips.length > 0 ? (
        <span className="local-app-banner__chips" aria-hidden>
          {chips.map((chip) => (
            <span key={chip} className="local-app-banner__chip">
              {chip}
            </span>
          ))}
        </span>
      ) : null}
      <span className="local-app-banner__cta">{cta}</span>
    </a>
  );
}
