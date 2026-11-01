import { EventEmitter } from "events";
import { prisma } from "./prisma";

// Global singleton event emitter across hot-reloads
const globalForEvents = globalThis as unknown as { appEventEmitter?: EventEmitter };

export const appEventEmitter = globalForEvents.appEventEmitter || new EventEmitter();
appEventEmitter.setMaxListeners(500);

if (process.env.NODE_ENV !== "production") {
  globalForEvents.appEventEmitter = appEventEmitter;
}

export interface AppRealtimeEvent {
  channel: string;
  type: string;
  data: any;
  timestamp: string;
}

/**
 * Publishes a real-time event to internal subscribers and broadcasts across PostgreSQL LISTEN/NOTIFY.
 */
export function publishEvent(channel: string, type: string, data: any = {}) {
  const eventPayload: AppRealtimeEvent = {
    channel,
    type,
    data,
    timestamp: new Date().toISOString(),
  };

  // 1. Emit to in-process subscribers
  appEventEmitter.emit(channel, eventPayload);
  // Also emit to universal wildcard channel
  appEventEmitter.emit("*", eventPayload);

  // 2. Broadcast to PostgreSQL NOTIFY if connected (cross-instance sync on Render/Vercel)
  try {
    const rawPayload = JSON.stringify(eventPayload);
    // PostgreSQL payload length limit is 8000 bytes
    if (rawPayload.length < 7500) {
      prisma.$executeRawUnsafe(
        `SELECT pg_notify('homemart4u_events', $1)`,
        rawPayload
      ).catch((err) => {
        // Non-blocking fallback if PG notify fails
        if (process.env.NODE_ENV !== "production") {
          console.debug("[PG_NOTIFY_SKIPPED]", err?.message);
        }
      });
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Subscribes a listener to one or more channels. Returns an unsubscribe cleanup function.
 */
export function subscribeToChannels(
  channels: string[],
  listener: (event: AppRealtimeEvent) => void
): () => void {
  const channelList = channels.filter(Boolean);

  channelList.forEach((channel) => {
    appEventEmitter.on(channel, listener);
  });

  return () => {
    channelList.forEach((channel) => {
      appEventEmitter.off(channel, listener);
    });
  };
}

