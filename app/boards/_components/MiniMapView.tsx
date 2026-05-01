'use client';

import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { GoogleMapsProvider, useGoogleMapsLoader } from '@/components/maps/GoogleMapsProvider';

type Props = {
  lat: number;
  lng: number;
  /** px height */
  height?: number;
};

function Inner({ lat, lng, height = 220 }: Props) {
  const { isLoaded, apiKeyConfigured, loadError } = useGoogleMapsLoader();

  if (!apiKeyConfigured) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-white/20 bg-slate-950/50 text-xs text-slate-500"
        style={{ height }}
      >
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 가 없어 지도를 표시할 수 없습니다.
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-red-500/30 bg-red-950/30 text-xs text-red-200"
        style={{ height }}
      >
        지도 로드 오류
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-white/10 bg-slate-950/50 text-xs text-slate-400"
        style={{ height }}
      >
        지도 불러오는 중…
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full rounded-xl overflow-hidden border border-white/15 shadow-inner"
      mapContainerStyle={{ width: '100%', height }}
      center={{ lat, lng }}
      zoom={15}
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
      }}
    >
      <MarkerF position={{ lat, lng }} />
    </GoogleMap>
  );
}

/** 읽기 전용 미니 지도 */
export function MiniMapView(props: Props) {
  return (
    <GoogleMapsProvider>
      <Inner {...props} />
    </GoogleMapsProvider>
  );
}
