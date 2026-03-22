import { useState } from 'react';
import { useCameraLocations } from './hooks/useCameraLocations';
import { DatePicker } from './components/DatePicker';
import { Map } from './components/Map';
import './App.css';

function App() {
  const { setDate, dateStr, data, loading, error } = useCameraLocations();
  const [showDebug, setShowDebug] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mobile Speed Camera Locations</h1>
        <DatePicker value={dateStr} onChange={setDate} disabled={loading} />
        <button
          type="button"
          className="debug-toggle"
          onClick={() => setShowDebug((v) => !v)}
          title="Toggle API debug"
        >
          Debug
        </button>
        {showDebug && (
          <div className="debug-popup" role="dialog" aria-label="API response debug">
            <button
              type="button"
              className="debug-close"
              onClick={() => setShowDebug(false)}
              aria-label="Close debug"
            >
              ×
            </button>
            <pre className="debug-content">
              {error
                ? `Error: ${error.message}`
                : data
                  ? JSON.stringify(data, null, 2)
                  : loading
                    ? 'Loading…'
                    : 'No data'}
            </pre>
          </div>
        )}
      </header>
      {error && (
        <div className="app-error" role="alert">
          {error.message}
        </div>
      )}
      <main className="app-main">
        <Map data={data} loading={loading} />
      </main>
    </div>
  );
}

export default App;
