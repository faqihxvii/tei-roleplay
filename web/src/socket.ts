import { useEffect, useRef, useState } from 'react';
import type { ClientMessage, ServerMessage } from '../../room/src/protocol';

export type Status = 'menghubungkan' | 'terhubung' | 'terputus';

/**
 * One socket to the room server that reconnects with backoff. `hello` is asked again on every
 * (re)connect, so a phone that just joined comes back with its token instead of joining twice.
 */
export function useRoomSocket(hello: () => ClientMessage | null, onMessage: (message: ServerMessage) => void, enabled: boolean) {
  const [status, setStatus] = useState<Status>('menghubungkan');
  const wsRef = useRef<WebSocket | null>(null);
  const helloRef = useRef(hello);
  const onMessageRef = useRef(onMessage);
  helloRef.current = hello;
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const open = () => {
      setStatus(attempt ? 'terputus' : 'menghubungkan');
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      wsRef.current = ws;
      ws.onopen = () => {
        attempt = 0;
        setStatus('terhubung');
        const first = helloRef.current();
        if (first) ws.send(JSON.stringify(first));
      };
      ws.onmessage = event => onMessageRef.current(JSON.parse(String(event.data)) as ServerMessage);
      ws.onclose = event => {
        if (stopped || event.code === 4000) return; // 4000: kicked, do not come back
        setStatus('terputus');
        retry = setTimeout(open, Math.min(8000, 500 * 2 ** attempt++));
      };
    };

    open();
    // Script errors go to the room's anonymous telemetry: first line only, each message once per page.
    const reported = new Set<string>();
    const report = (raw: unknown) => {
      const message = (raw instanceof Error ? `${raw.name}: ${raw.message}` : String(raw ?? 'unknown')).split('\n')[0]!.slice(0, 300);
      if (reported.has(message) || reported.size >= 10 || wsRef.current?.readyState !== WebSocket.OPEN) return;
      reported.add(message);
      wsRef.current.send(JSON.stringify({ t: 'clientError', message } satisfies ClientMessage));
    };
    const onError = (e: ErrorEvent) => report(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => report(e.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    // Phones lock their screens; reconnect at once when they wake instead of waiting out the backoff.
    const wake = () => {
      if (document.visibilityState === 'visible' && wsRef.current?.readyState === WebSocket.CLOSED) {
        clearTimeout(retry);
        open();
      }
    };
    document.addEventListener('visibilitychange', wake);
    return () => {
      stopped = true;
      clearTimeout(retry);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      wsRef.current?.close();
    };
  }, [enabled]);

  const send = (message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(message));
  };

  return { status, send };
}

/** Server time minus local time, so countdowns agree across devices with wrong clocks. */
export function useClockOffset() {
  const offset = useRef(0);
  return {
    sync: (serverNow: number) => { offset.current = serverNow - Date.now(); },
    now: () => Date.now() + offset.current,
  };
}

/** Whole seconds left until `endsAt` (server time), ticking every second. */
export function useSecondsLeft(endsAt: number | null, now: () => number): number | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (endsAt === null) return;
    const id = setInterval(() => force(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt === null ? null : Math.max(0, Math.ceil((endsAt - now()) / 1000));
}

export function formatSeconds(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* private mode: the session just won't survive a refresh */ }
  },
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};
