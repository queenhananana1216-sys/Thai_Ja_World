export type UxEventType = 'page_view' | 'click' | 'dead_click' | 'js_error' | 'api_error';

export type UxTrackEvent = {
  session_id: string;
  locale: 'ko' | 'th';
  path: string;
  event_type: UxEventType;
  target_text?: string;
  target_role?: string;
  meta?: Record<string, unknown>;
};

export type UxFlagMap = Record<string, Record<string, unknown>>;

