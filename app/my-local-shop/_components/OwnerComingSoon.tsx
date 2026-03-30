import type { ReactNode } from 'react';

export default function OwnerComingSoon({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <section
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: 20,
        background: '#f8fafc',
      }}
    >
      <h2 style={{ fontSize: '1.05rem', margin: '0 0 10px' }}>{title}</h2>
      <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.55 }}>{children}</div>
    </section>
  );
}
