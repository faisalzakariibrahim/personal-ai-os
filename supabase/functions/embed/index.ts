// Personal AI OS — embedding service (gte-small, 384 dims). Deployed to Supabase.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const session = new Supabase.ai.Session("gte-small");

Deno.serve(async (req: Request) => {
  try {
    const { text, texts } = await req.json();
    const inputs: string[] = texts ?? (text ? [text] : []);
    if (!inputs.length) {
      return new Response(JSON.stringify({ error: "Provide 'text' or 'texts'" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const embeddings: number[][] = [];
    for (const t of inputs) {
      const e = (await session.run(t, { mean_pool: true, normalize: true })) as number[];
      embeddings.push(Array.from(e));
    }
    return new Response(JSON.stringify({ embeddings }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
