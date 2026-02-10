import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || messages.length < 2) {
      return Response.json({ error: 'Insufficient messages for title generation' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Get first user message for title generation
    const firstUserMessage = messages.find(msg => msg.role === 'user')?.content || '';
    
    // Strict prompt for clean title generation
    const prompt = `Generate exactly 3-5 keywords as title for: "${firstUserMessage}". 
Rules: 
- NO quotes or quotation marks
- NO prefixes like "Title:", "Titre:", "Sujet:"
- NO markdown formatting
- NO additional text or explanations
- Just the keywords separated by spaces
- Use same language as the message

Respond ONLY with the title.`;

    const result = await model.generateContent(prompt);
    let title = result.response.text().trim();

    // Robust cleaning logic
    title = title
      // Remove any prefixes
      .replace(/^(Title|Titre|Sujet|Subject)\s*[:|-]?\s*/i, '')
      // Remove quotes and brackets
      .replace(/["'*`]/g, '')
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Remove common filler words
      .replace(/\b(voici|voilà|ceci|cela|discutons|conversation|chat)\b/gi, '')
      // Clean extra whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // Ensure title is not too long
    if (title.length > 50) {
      title = title.split(' ').slice(0, 5).join(' ');
    }

    // Ensure we have at least something
    if (!title || title.length < 2) {
      title = firstUserMessage.split(' ').slice(0, 3).join(' ');
    }

    return Response.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return Response.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}
