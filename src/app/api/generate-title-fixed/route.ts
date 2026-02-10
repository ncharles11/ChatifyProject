import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Stricter prompt for title generation
    const prompt = `Génère un titre de 3 à 5 mots pour résumer cette demande : '${message}'. Réponds SEULEMENT avec le titre, sans guillemets, sans texte additionnel.`;

    const result = await model.generateContent(prompt);
    let title = result.response.text().trim();

    // Clean the title from quotes and extra text
    title = title.replace(/^["']|["']$/g, '').trim();
    
    // Ensure title is not too long and remove any remaining polite phrases
    if (title.length > 50) {
      title = title.split(' ').slice(0, 5).join(' ');
    }
    
    // Remove common polite phrases
    title = title.replace(/^(voici|voilà|titre:|sujet:)\s*/i, '');

    return Response.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    return Response.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}
