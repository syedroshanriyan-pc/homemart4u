"use client";

import { useEffect, useRef } from "react";

export interface UseRealTimeOptions {
  channels: string[];
  onEvent?: (event: { channel: string; type: string; data: any; timestamp: string }) => void;
  onRefresh?: () => void;
  fallbackIntervalMs?: number; // Bounded fallback polling (default 60000ms = 60s)
  enabled?: boolean;
}

/**
 * Shared Real-Time hook using Server-Sent Events (SSE) backed by /api/events.
 * Provides instant data invalidation/refetch upon server event publication,
 * with automatic reconnection backoff and bounded fallback polling.
 */
export function useRealTime({
  channels,
  onEvent,
  onRefresh,
  fallbackIntervalMs = 60000,
  enabled = true,
}: UseRealTimeOptions) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const channelsKey = channels.filter(Boolean).sort().join(",");

  useEffect(() => {
    if (!enabled || !channelsKey) return;

    let eventSource: EventSource | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let retryDelay = 1000;
    let isDisposed = false;

    function connect() {
      if (isDisposed) return;
      try {
        const url = `/api/events?channels=${encodeURIComponent(channelsKey)}`;
        eventSource = new EventSource(url, { withCredentials: true });

        eventSource.onopen = () => {
          retryDelay = 1000; // Reset retry backoff
        };

        eventSource.onmessage = (e) => {
          if (!e.data) return;
          try {
            const parsed = JSON.parse(e.data);
            onEventRef.current?.(parsed);
            onRefreshRef.current?.();
          } catch {
            // Ignore parse errors
          }
        };

        const eventNames = [
          "ORDER_CREATED",
          "ORDER_STATUS_CHANGED",
          "ORDER_UPDATED",
          "DELIVERY_STARTED",
          "DELIVERY_COMPLETED",
          "AGENT_ASSIGNED",
          "PRODUCT_UPDATED",
          "PRODUCT_PRICE_UPDATED",
          "CATALOG_UPDATED",
          "SETTINGS_UPDATED",
        ];

        eventNames.forEach((name) => {
          eventSource?.addEventListener(name, (e: any) => {
            try {
              const parsed = JSON.parse(e.data);
              onEventRef.current?.(parsed);
              onRefreshRef.current?.();
            } catch {
              onRefreshRef.current?.();
            }
          });
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isDisposed) {
            reconnectTimer = setTimeout(() => {
              retryDelay = Math.min(retryDelay * 1.5, 15000);
              connect();
            }, retryDelay);
          }
        };
      } catch {
        // Fallback polling will handle it
      }
    }

    connect();

    // Bounded fallback polling in case SSE is blocked by client proxies
    if (fallbackIntervalMs > 0) {
      fallbackTimer = setInterval(() => {
        onRefreshRef.current?.();
      }, fallbackIntervalMs);
    }

    return () => {
      isDisposed = true;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (fallbackTimer) clearInterval(fallbackTimer);
    };
  }, [channelsKey, enabled, fallbackIntervalMs]);
}
