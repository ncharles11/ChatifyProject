import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || messages.length < 2) {
      return Response.json({ error: 'Insufficient messages for title generation' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Create conversation summary
    const conversation = messages
      .slice(0, 4) // Use first few messages to avoid long prompts
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n');

    const prompt = `Summarize this conversation in 3 to 5 words for a title. No quotation marks. Use the language of the conversation.\n\nConversation:\n${conversation}`;

    const result = await model.generateContent(prompt);
    const title = result.response.text().trim();

    return Response.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return Response.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}
