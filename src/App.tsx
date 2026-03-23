import { useState } from 'react';
import { useCameraLocations } from './hooks/useCameraLocations';
import { DatePicker } from './components/DatePicker';
import { Map } from './components/Map';
import { MapControls, type MapOptions } from './components/MapControls';
import './App.css';

const DEFAULT_MAP_OPTIONS: MapOptions = { showSuburbs: true, uniqueSuburbs: true };

function App() {
  const { setDate, dateStr, data, loading, error } = useCameraLocations();
  const [showMapOptions, setShowMapOptions] = useState(false);
  const [mapOptions, setMapOptions] = useState<MapOptions>(DEFAULT_MAP_OPTIONS);
  const [resetPositionTrigger, setResetPositionTrigger] = useState(0);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mobile Speed Camera Locations</h1>
        <DatePicker value={dateStr} onChange={setDate} disabled={loading} />
        <button
          type="button"
          className="map-options-toggle"
          onClick={() => setShowMapOptions((v) => !v)}
          title="Map display options"
        >
          Options
        </button>
        {showMapOptions && (
          <MapControls
            options={mapOptions}
            onChange={setMapOptions}
            dateStr={dateStr}
            onClose={() => setShowMapOptions(false)}
            onResetPosition={() => setResetPositionTrigger((t) => t + 1)}
          />
        )}
      </header>
      {error && (
        <div className="app-error" role="alert">
          {error.message}
        </div>
      )}
      <main className="app-main">
        <Map data={data} loading={loading} options={mapOptions} resetPositionTrigger={resetPositionTrigger} />
      </main>
    </div>
  );
}

export default App;
