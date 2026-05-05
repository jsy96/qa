import { NextRequest } from 'next/server';
import { runAnalysis } from '@/lib/agent/orchestrator';

export async function POST(request: NextRequest) {
  const { query } = await request.json();
  if (!query || typeof query !== 'string') {
    return new Response(JSON.stringify({ error: 'query is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runAnalysis(query)) {
          const sseMessage = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));
        }
      } catch (err) {
        const errorMsg = `event: error\ndata: ${JSON.stringify({
          message: err instanceof Error ? err.message : 'Analysis failed',
        })}\n\n`;
        controller.enqueue(encoder.encode(errorMsg));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
