'use client';

/**
 * Google Maps JS API 로더 + 컨텍스트.
 * Places 등 `@react-google-maps/api` 하위 컴포넌트를 쓰려면 이 Provider로 감싸세요.
 * 키: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
 */
import { useJsApiLoader } from '@react-google-maps/api';
import { createContext, useContext, type ReactNode } from 'react';

const PLACES_LIBS: 'places'[] = ['places'];

export type GoogleMapsLoaderContextValue = {
  /** API 키가 없으면 false (스크립트 미로드) */
  apiKeyConfigured: boolean;
  /** 스크립트 로드 완료 여부 (키 없으면 true로 간주해 레이아웃만 렌더) */
  isLoaded: boolean;
  loadError: Error | undefined;
};

const GoogleMapsLoaderContext = createContext<GoogleMapsLoaderContextValue | null>(null);

export function useGoogleMapsLoader(): GoogleMapsLoaderContextValue {
  const ctx = useContext(GoogleMapsLoaderContext);
  if (!ctx) {
    throw new Error('useGoogleMapsLoader must be used within GoogleMapsProvider');
  }
  return ctx;
}

function LoaderInner({
  apiKey,
  children,
}: {
  apiKey: string;
  children: ReactNode;
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'living-in-thai-google-maps-script',
    googleMapsApiKey: apiKey,
    libraries: PLACES_LIBS,
    preventGoogleFontsLoading: true,
  });

  const value: GoogleMapsLoaderContextValue = {
    apiKeyConfigured: true,
    isLoaded,
    loadError,
  };

  return (
    <GoogleMapsLoaderContext.Provider value={value}>{children}</GoogleMapsLoaderContext.Provider>
  );
}

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

  if (!apiKey) {
    return (
      <GoogleMapsLoaderContext.Provider
        value={{
          apiKeyConfigured: false,
          isLoaded: true,
          loadError: undefined,
        }}
      >
        {children}
      </GoogleMapsLoaderContext.Provider>
    );
  }

  return <LoaderInner apiKey={apiKey}>{children}</LoaderInner>;
}
