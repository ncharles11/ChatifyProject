import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { chatId, messages } = await request.json();

    if (!chatId || !messages || messages.length < 1) {
      return Response.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Create conversation summary from first few messages
    const conversation = messages
      .slice(0, 2) // Use first 2 messages for title generation
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `Summarize this conversation in 3 to 5 words for a title. No quotation marks. Use the language of the conversation.\n\nConversation:\n${conversation}`;

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    // Update chat title in database
    const supabase = await createClient();
    const { error } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId);

    if (error) {
      console.error('Error updating chat title:', error);
      return Response.json({ error: 'Failed to update title' }, { status: 500 });
    }

    return Response.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return Response.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}
