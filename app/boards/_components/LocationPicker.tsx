'use client';

import { useCallback, useMemo, useState } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { GoogleMapsProvider, useGoogleMapsLoader } from '@/components/maps/GoogleMapsProvider';
import { geocodeAddress, reverseGeocode } from '@/lib/maps/geocode';

const BKK = { lat: 13.7563, lng: 100.5018 };

export type LocationValue = {
  lat: number | null;
  lng: number | null;
  address: string | null;
};

type InnerProps = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
};

function LocationPickerInner({ value, onChange }: InnerProps) {
  const { isLoaded, apiKeyConfigured, loadError } = useGoogleMapsLoader();
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const center = useMemo(() => {
    if (value.lat != null && value.lng != null) {
      return { lat: value.lat, lng: value.lng };
    }
    return BKK;
  }, [value.lat, value.lng]);

  const onMapClick = useCallback(
    async (e: { latLng?: google.maps.LatLng | null }) => {
      const ll = e.latLng;
      if (!ll) return;
      const lat = ll.lat();
      const lng = ll.lng();
      setBusy(true);
      setHint(null);
      try {
        const rev = await reverseGeocode(lat, lng);
        const addr = 'error' in rev ? null : rev.formatted_address;
        onChange({ lat, lng, address: addr });
        if ('error' in rev) setHint('주소 변환에 실패했습니다. 좌표만 저장됩니다.');
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  const onSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setBusy(true);
    setHint(null);
    try {
      const res = await geocodeAddress(q);
      if ('error' in res) {
        setHint(res.error === 'missing_google_maps_api_key' ? '지도 API 키가 없습니다.' : '검색 결과가 없습니다.');
        return;
      }
      onChange({
        lat: res.lat,
        lng: res.lng,
        address: res.formatted_address,
      });
    } finally {
      setBusy(false);
    }
  };

  if (!apiKeyConfigured) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-100">
        위치 선택을 쓰려면 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 를 설정하세요.
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-xs text-red-100">
        Google Maps 로드 실패
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-950/50 p-8 text-center text-xs text-slate-400">
        지도 로딩 중…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void onSearch())}
          placeholder="장소·주소 검색 (예: 방콕 카오산)"
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-0 backdrop-blur-md placeholder:text-slate-500 focus:border-sky-400/50"
        />
        <button
          type="button"
          onClick={() => void onSearch()}
          disabled={busy}
          className="shrink-0 rounded-xl border border-sky-400/35 bg-sky-500/20 px-4 py-2 text-xs font-bold text-sky-50 backdrop-blur-md hover:bg-sky-500/30 disabled:opacity-50"
        >
          검색으로 이동
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: 320 }}
          center={center}
          zoom={value.lat != null ? 15 : 11}
          onClick={onMapClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {value.lat != null && value.lng != null ? (
            <MarkerF position={{ lat: value.lat, lng: value.lng }} />
          ) : null}
        </GoogleMap>
        {busy ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/40 text-xs font-semibold text-white">
            처리 중…
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs backdrop-blur-md">
        <span className="font-semibold text-slate-400">선택 위치 · </span>
        <span className="text-slate-200">
          {value.lat != null && value.lng != null
            ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : '지도를 클릭하거나 검색하세요'}
        </span>
        {value.address ? (
          <p className="mt-1 text-[11px] leading-snug text-slate-300">{value.address}</p>
        ) : null}
        {hint ? <p className="mt-1 text-amber-200/90">{hint}</p> : null}
      </div>
    </div>
  );
}

export function LocationPicker(props: InnerProps) {
  return (
    <GoogleMapsProvider>
      <LocationPickerInner {...props} />
    </GoogleMapsProvider>
  );
}
