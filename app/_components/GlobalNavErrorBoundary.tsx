'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GlobalNavFallback } from './GlobalNavFallback';

type Props = { children: ReactNode };

type State = { hasError: boolean };

/**
 * GlobalNav 트리 내부 렌더 예외 시에도 루트 레이아웃이 깨지지 않도록 최소 헤더로 대체.
 */
export class GlobalNavErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[GlobalNavErrorBoundary]', error.message, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return <GlobalNavFallback />;
    }
    return this.props.children;
  }
}
