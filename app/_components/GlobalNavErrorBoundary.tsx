'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GlobalNavFallback } from './GlobalNavFallback';

type Props = { children: ReactNode };

type State = { hasError: boolean };

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
