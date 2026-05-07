import { StrictMode, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import { ResolvedLocationsRpcDebugView } from './ResolvedLocationsRpcDebugView';

/**
 * Opens a dedicated tab and mounts {@link ResolvedLocationsRpcDebugView} via `createRoot`.
 *
 * @param params - Same shape as `fetchCameraLocations` (`src/api/cameraLocations.ts`).
 * @returns `false` when `window.open()` returns `null` (typically a blocked popup).
 */
export function openResolvedLocationsQueryDebugWindow(params: { date: string }): boolean {
  const opened = typeof window !== 'undefined' ? window.open('about:blank', '_blank', 'noopener,noreferrer') : null;
  if (!opened) return false;

  const doc = opened.document;
  doc.open();
  doc.write(
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<title>Supabase RPC — camera locations</title></head><body></body></html>'
  );
  doc.close();

  const mount = doc.body;
  if (!mount) return true;

  const container = doc.createElement('div');
  mount.appendChild(container);

  const root = createRoot(container);
  root.render(
    createElement(StrictMode, null, createElement(ResolvedLocationsRpcDebugView, { params }))
  );

  return true;
}
