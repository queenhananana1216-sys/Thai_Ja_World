'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  name: string;
  fallback: ReactNode;
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ClientSafeBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ClientSafeBoundary:${this.props.name}]`, error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
