export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const body = await request.json();

    const ai = env.AI;               // bound in wrangler.toml OR via “AI” binding in dashboard
    const answer = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: body.messages,       // {role:"user", content:"…"}
      stream: true,
    });

    // stream decoder → Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of answer) {
          const token = chunk.response;          // partial string
          const sse   = `data: ${JSON.stringify({token})}\n\n`;
          controller.enqueue(encoder.encode(sse));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  }
};