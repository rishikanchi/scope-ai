import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { runner } from "@/lib/dedalus/client";

export async function POST(req: NextRequest) {
  const { message, conversationId } = await req.json();

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let title: string;

  try {
    const result = await runner.run({
      model: "anthropic/claude-sonnet-4-5-20250929",
      input: [
        {
          role: "user" as const,
          content: `Generate a short chat title (3-6 words, no quotes, no punctuation) that summarizes this message's topic. Reply with ONLY the title.\n\nMessage: "${message}"`,
        },
      ],
      stream: false,
      maxSteps: 1,
    });

    title = (result as any).output?.trim() || (result as any).finalOutput?.trim() || (result as any).content?.trim();

    if (!title || title.length > 60) {
      title = message.length > 50 ? message.slice(0, 47) + "..." : message;
    }
  } catch (err) {
    console.error("Title generation failed:", err);
    title = message.length > 50 ? message.slice(0, 47) + "..." : message;
  }

  await supabase
    .from("conversations")
    .update({ title })
    .eq("id", conversationId);

  return Response.json({ title });
}
