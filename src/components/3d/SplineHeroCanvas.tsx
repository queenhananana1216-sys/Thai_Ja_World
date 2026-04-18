'use client';

interface SplineHeroCanvasProps {
  sceneUrl?: string;
}

export function SplineHeroCanvas({ sceneUrl }: SplineHeroCanvasProps) {
  if (!sceneUrl) {
    return (
      <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,#3b1f5a_0%,#151235_42%,#070812_100%)]" aria-hidden>
        <div className="h-full w-full bg-[linear-gradient(120deg,rgba(196,181,253,0.1),transparent_45%,rgba(249,168,212,0.1))]" />
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden" aria-hidden>
      <iframe
        src={sceneUrl}
        className="pointer-events-none h-full w-full border-0"
        title="Thai Ja World 3D Hero"
        loading="eager"
        allow="autoplay; fullscreen"
      />
    </div>
  );
}
