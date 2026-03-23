import { useRef, useEffect } from 'react';
import { getCameraLocationsUrl } from '../api/cameraLocations';

export interface MapOptions {
  showSuburbs: boolean;
  uniqueSuburbs: boolean;
  fitAllLocations: boolean;
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
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        <label className="map-controls-checkbox">
          <input
            type="checkbox"
            checked={options.fitAllLocations}
            onChange={(e) => onChange({ ...options, fitAllLocations: e.target.checked })}
          />
          <span>Fit all locations</span>
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
