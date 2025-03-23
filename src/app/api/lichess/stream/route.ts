import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('lichess_token')?.value;

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const streamResponse = await fetch('https://lichess.org/api/stream/event', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      // Important: Keep the connection alive
      cache: 'no-store',
      keepalive: true,
    });

    if (!streamResponse.ok) {
      throw new Error('Failed to connect to Lichess stream');
    }

    // Set up the response headers for SSE
    const responseHeaders = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let buffer = '';

    // Create a transform stream to handle the ndjson stream
    const transform = new TransformStream({
      async transform(chunk: Uint8Array, controller) {
        // Append the new chunk to our buffer and split on newlines
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        
        // Process all complete lines
        buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              // Try to parse the JSON to validate it
              const event = JSON.parse(line);
              console.log('Stream event:', event);
              
              // Forward the event as SSE
              controller.enqueue(encoder.encode(`data: ${line}\n\n`));
            } catch (e) {
              console.error('Error processing stream line:', e);
            }
          }
        }

        // Keep the connection alive by sending a heartbeat
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      },
      flush(controller) {
        // Process any remaining data in the buffer
        if (buffer.trim()) {
          try {
            const event = JSON.parse(buffer);
            console.log('Final stream event:', event);
            controller.enqueue(encoder.encode(`data: ${buffer}\n\n`));
          } catch (e) {
            console.error('Error processing final buffer:', e);
          }
        }
      }
    });

    // Create and return the response
    return new Response(streamResponse.body?.pipeThrough(transform), {
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Stream error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to initialize stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 