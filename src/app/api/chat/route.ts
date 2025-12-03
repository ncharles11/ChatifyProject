import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
interface Message {
  id?: number;
  created_at?: string;
  content: string;
  role: 'user' | 'model';
  user_id: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message, history } = await req.json();

  await supabase.from('messages').insert({
    content: message,
    role: 'user',
    user_id: user.id
  });

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const chat = model.startChat({
    history: history.map((msg: Message) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })),
  });

  const result = await chat.sendMessageStream(message);
  
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = '';

      try {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;
          controller.enqueue(encoder.encode(chunkText));
        }

        await supabase.from('messages').insert({
          content: fullResponse,
          role: 'model',
          user_id: user.id
        });

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new NextResponse(stream);
}