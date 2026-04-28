type LocalAppBannerTone = 'mobility' | 'delivery';

type LocalAppBannerProps = {
  tone: LocalAppBannerTone;
  title: string;
  subtitle: string;
  cta: string;
  badge: string;
  href?: string;
};

export default function LocalAppBanner({
  tone,
  title,
  subtitle,
  cta,
  badge,
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
      <span className="local-app-banner__badge">{badge}</span>
      <strong className="local-app-banner__title">{title}</strong>
      <span className="local-app-banner__subtitle">{subtitle}</span>
      <span className="local-app-banner__cta">{cta}</span>
    </a>
  );
}
