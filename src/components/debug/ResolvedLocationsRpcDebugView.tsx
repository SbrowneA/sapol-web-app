import { useEffect, useState } from 'react';

import type { ApiCameraLocations } from '../../types/api';
import {
  API_RESOLVED_LOCATIONS_BY_DATE_BY_REGION,
  fetchCameraLocations,
  RPC_ARG_Q_DATE_FOR_BY_REGION,
} from '../../api/cameraLocations';

function summarizeRpcForDebug(params: { date: string }) {
  return {
    rpcName: API_RESOLVED_LOCATIONS_BY_DATE_BY_REGION,
    arguments: { [RPC_ARG_Q_DATE_FOR_BY_REGION]: params.date },
  };
}

const SURFACE_FONT = `13px system-ui, sans-serif`;
const PRE_FONT = `12px ui-monospace, 'Cascadia Code', monospace`;

export interface ResolvedLocationsRpcDebugViewProps {
  /** Same shape passed to {@link fetchCameraLocations}. */
  params: { date: string };
}

type RpcDebugChromeProps = {
  statusLine: string;
  paramsJson: string;
  resultsText: string;
};

/** Shared layout shell for skipped vs fetched RPC previews. */
function RpcDebugChrome({ statusLine, paramsJson, resultsText }: RpcDebugChromeProps) {
  const preWrap = {
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    overflowX: 'auto' as const,
    padding: '0.75rem 1rem',
    margin: '0.35rem 0 0',
    background: '#fff',
    border: '1px solid #cbd5f5',
    borderRadius: 6,
    fontFamily: PRE_FONT,
    fontSize: 12,
  };

  const h2 = {
    margin: '1.35rem 0 0.4rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '0.25rem',
  };

  const rootWrap = {
    boxSizing: 'border-box' as const,
    margin: '0 auto',
    maxWidth: '72rem',
    padding: '1rem 1.25rem',
    font: SURFACE_FONT,
    lineHeight: 1.45,
    color: '#0f172a',
    background: '#f8fafc',
    minHeight: '100%',
  };

  return (
    <div style={{ boxSizing: 'border-box', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={rootWrap}>
        <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem' }}>Supabase RPC (debug)</h1>
        <p style={{ color: '#475569', fontSize: 12, margin: '0.25rem 0 0' }}>{statusLine}</p>
        <h2 style={h2}>Query parameters</h2>
        <pre style={preWrap}>{paramsJson}</pre>
        <h2 style={h2}>JSON results</h2>
        <pre style={preWrap}>{resultsText}</pre>
      </div>
    </div>
  );
}

function ResolvedLocationsRpcDebugFetched(props: {
  params: ResolvedLocationsRpcDebugViewProps['params'];
  paramsJson: string;
}) {
  const { params, paramsJson } = props;
  const [statusLine, setStatusLine] = useState('Fetching…');
  const [resultsText, setResultsText] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetchCameraLocations(params)
      .then((data: ApiCameraLocations) => {
        if (!cancelled) {
          setStatusLine('Fetched via Supabase JS client.');
          setResultsText(JSON.stringify(data, null, 2));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatusLine('RPC failed.');
          setResultsText(err instanceof Error ? err.stack ?? err.message : String(err));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [params, params.date]);

  return <RpcDebugChrome statusLine={statusLine} paramsJson={paramsJson} resultsText={resultsText} />;
}

/**
 * Renders RPC metadata and the prettified payload returned / error from Supabase `.rpc(...)`.
 */
export function ResolvedLocationsRpcDebugView({ params }: ResolvedLocationsRpcDebugViewProps) {
  const descriptor = summarizeRpcForDebug(params);
  const paramsJson = JSON.stringify(
    { rpcFunction: descriptor.rpcName, rpcArgumentsJson: descriptor.arguments },
    null,
    2
  );

  return <ResolvedLocationsRpcDebugFetched params={params} paramsJson={paramsJson} />;
}
