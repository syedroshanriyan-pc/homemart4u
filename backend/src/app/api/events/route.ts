import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subscribeToChannels, AppRealtimeEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  const { searchParams } = new URL(req.url);
  const requestedChannels = (searchParams.get("channels") || "catalog")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  // Authorize channels
  const authorizedChannels: string[] = [];

  for (const channel of requestedChannels) {
    if (channel === "catalog") {
      authorizedChannels.push("catalog");
    } else if (channel === "admin") {
      if (session && session.role === "ADMIN") {
        authorizedChannels.push("admin");
      }
    } else if (channel.startsWith("agent")) {
      if (session && (session.role === "DELIVERY_AGENT" || session.role === "ADMIN")) {
        authorizedChannels.push(channel);
      }
    } else if (channel.startsWith("order:")) {
      const orderId = channel.replace("order:", "");
      if (session) {
        if (session.role === "ADMIN") {
          authorizedChannels.push(channel);
        } else {
          // Verify customer or delivery agent assignment
          const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true, deliveryAssignment: { select: { agentUserId: true } } },
          });
          if (
            order &&
            (order.userId === session.id ||
              order.deliveryAssignment?.agentUserId === session.id)
          ) {
            authorizedChannels.push(channel);
          }
        }
      }
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection handshake
      const initialPayload = JSON.stringify({
        status: "connected",
        authorizedChannels,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`event: connected\ndata: ${initialPayload}\n\n`));

      // 2. Event listener
      const onEvent = (event: AppRealtimeEvent) => {
        try {
          const chunk = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Stream might be closing
        }
      };

      const unsubscribe = subscribeToChannels(authorizedChannels, onEvent);

      // 3. Heartbeat keepalive ping (every 15s)
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:keepalive\n\n`));
        } catch {
          clearInterval(pingInterval);
        }
      }, 15000);

      // 4. Abort / cleanup
      req.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
