import { useSyncExternalStore } from "react";

export type PreviewWorkspace = "customer" | "business" | "rider";

let activeWorkspace: PreviewWorkspace = "customer";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return activeWorkspace;
}

export function setPreviewWorkspace(workspace: PreviewWorkspace) {
  activeWorkspace = workspace;
  listeners.forEach((listener) => listener());
}

export function getPreviewWorkspaceDestination(workspace: PreviewWorkspace) {
  if (workspace === "customer") return "/(tabs)";
  if (workspace === "business") return "/business/home";
  return "/rider";
}

export function useWorkspacePreview() {
  const workspace = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { activeWorkspace: workspace, setActiveWorkspace: setPreviewWorkspace };
}
