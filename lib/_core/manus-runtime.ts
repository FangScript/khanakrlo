import type { Metrics } from "react-native-safe-area-context";

export function subscribeSafeAreaInsets(_callback: (metrics: Metrics) => void): () => void {
  return () => {};
}

export function initManusRuntime(): void {}

export function isRunningInPreviewIframe(): boolean {
  return false;
}
