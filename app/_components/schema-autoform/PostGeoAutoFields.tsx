'use client';

/**
 * Schema-Aware: `posts.latitude|longitude|location_name` 입력 묶음.
 * 계약은 `src/lib/schema-autoform/postGeoFieldGroup.ts` 와 동기화합니다.
 */
export type PostGeoAutoFieldsValue = {
  latitude: string;
  longitude: string;
  location_name: string;
};

export default function PostGeoAutoFields({
  value,
  onChange,
  labels,
}: {
  value: PostGeoAutoFieldsValue;
  onChange: (next: PostGeoAutoFieldsValue) => void;
  labels: {
    section: string;
    latitude: string;
    longitude: string;
    locationName: string;
    hint: string;
  };
}) {
  return (
    <fieldset className="space-y-2 rounded-xl border border-cyan-500/20 bg-slate-950/50 p-3">
      <legend className="text-sm font-semibold text-cyan-100/95">{labels.section}</legend>
      <p className="m-0 text-xs text-slate-400">{labels.hint}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-200" htmlFor="post-geo-lat">
          {labels.latitude}
          <input
            id="post-geo-lat"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value.latitude}
            onChange={(e) => onChange({ ...value, latitude: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-200" htmlFor="post-geo-lng">
          {labels.longitude}
          <input
            id="post-geo-lng"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value.longitude}
            onChange={(e) => onChange({ ...value, longitude: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
          />
        </label>
      </div>
      <label className="block text-xs font-semibold text-slate-200" htmlFor="post-geo-name">
        {labels.locationName}
        <input
          id="post-geo-name"
          type="text"
          maxLength={120}
          autoComplete="off"
          value={value.location_name}
          onChange={(e) => onChange({ ...value, location_name: e.target.value })}
          className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-400/50"
        />
      </label>
    </fieldset>
  );
}
