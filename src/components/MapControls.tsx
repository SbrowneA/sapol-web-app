import { useRef, useEffect } from 'react';
import { getCameraLocationsUrl } from '../api/cameraLocations';

export type StreetInteractionMode = 'hover' | 'click';
export type SuburbInteractionMode = 'hover' | 'click';

export interface MapOptions {
  showSuburbs: boolean;
  uniqueSuburbs: boolean;
  fitAllLocations: boolean;
  streetInteraction: StreetInteractionMode;
  suburbInteraction: SuburbInteractionMode;
  suburbHighlightOnInteraction: boolean;
  suburbOutlineSuburbs: boolean;
}

interface MapControlsProps {
  options: MapOptions;
  onChange: (options: MapOptions) => void;
  dateStr: string;
  onClose: () => void;
  onResetPosition: () => void;
}

export function MapControls({ options, onChange, dateStr, onClose, onResetPosition }: MapControlsProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDismissOutside = (e: MouseEvent | PointerEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleDismissOutside);
    document.addEventListener('pointerdown', handleDismissOutside);
    return () => {
      document.removeEventListener('mousedown', handleDismissOutside);
      document.removeEventListener('pointerdown', handleDismissOutside);
    };
  }, [onClose]);

  const apiUrl = getCameraLocationsUrl({ date: dateStr });

  return (
    <div ref={popupRef} className="map-controls-popup" role="dialog" aria-label="Map display options">
      <button
        type="button"
        className="map-controls-close"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <h3 className="map-controls-title">Map options</h3>
      <div className="map-controls-group">
        <label className="map-controls-checkbox">
          <input
            type="checkbox"
            checked={options.fitAllLocations}
            onChange={(e) => onChange({ ...options, fitAllLocations: e.target.checked })}
          />
          <span>Fit all locations</span>
        </label>
      </div>
      <div className="map-controls-group">
        <span className="map-controls-label">Street popup on</span>
        <div className="map-controls-radio-group">
          <label className="map-controls-radio">
            <input
              type="radio"
              name="streetInteraction"
              value="hover"
              checked={options.streetInteraction === 'hover'}
              onChange={() => onChange({ ...options, streetInteraction: 'hover' })}
            />
            <span>Hover</span>
          </label>
          <label className="map-controls-radio">
            <input
              type="radio"
              name="streetInteraction"
              value="click"
              checked={options.streetInteraction === 'click'}
              onChange={() => onChange({ ...options, streetInteraction: 'click' })}
            />
            <span>Click</span>
          </label>
        </div>
      </div>
      <div className="map-controls-group">
        <h4 className="map-controls-section-title">Suburbs</h4>
        <label className="map-controls-checkbox">
          <input
            type="checkbox"
            checked={options.showSuburbs}
            onChange={(e) => onChange({ ...options, showSuburbs: e.target.checked })}
          />
          <span>Show suburbs</span>
        </label>
        <label className="map-controls-checkbox">
          <input
            type="checkbox"
            checked={options.uniqueSuburbs}
            onChange={(e) => onChange({ ...options, uniqueSuburbs: e.target.checked })}
          />
          <span>Unique suburbs only</span>
        </label>
        <span className="map-controls-label">Suburb interaction</span>
        <div className="map-controls-radio-group">
          <label className="map-controls-radio">
            <input
              type="radio"
              name="suburbInteraction"
              value="hover"
              checked={options.suburbInteraction === 'hover'}
              onChange={() => onChange({ ...options, suburbInteraction: 'hover' })}
            />
            <span>Hover</span>
          </label>
          <label className="map-controls-radio">
            <input
              type="radio"
              name="suburbInteraction"
              value="click"
              checked={options.suburbInteraction === 'click'}
              onChange={() => onChange({ ...options, suburbInteraction: 'click' })}
            />
            <span>Click</span>
          </label>
        </div>
        <label className="map-controls-checkbox">
          <input
            type="checkbox"
            checked={options.suburbHighlightOnInteraction}
            onChange={(e) => onChange({ ...options, suburbHighlightOnInteraction: e.target.checked })}
          />
          <span>Highlight on interaction</span>
        </label>
        <label className="map-controls-checkbox">
          <input
            type="checkbox"
            checked={options.suburbOutlineSuburbs}
            onChange={(e) => onChange({ ...options, suburbOutlineSuburbs: e.target.checked })}
          />
          <span>Outline suburbs</span>
        </label>
      </div>
      <button
        type="button"
        className="map-controls-reset-btn"
        onClick={onResetPosition}
      >
        Reset position
      </button>
      <div className="map-controls-api">
        <a href={apiUrl} target="_blank" rel="noopener noreferrer">
          Open API response in new tab
        </a>
      </div>
    </div>
  );
}
