import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, history = [] } = await req.json();

    if (!message) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 2. Sauvegarder le message de l'utilisateur en DB
    await supabase.from('messages').insert({
      content: message,
      role: 'user',
      user_id: user.id
    });

    // 3. Préparer le contexte (System Prompt) avec la DATE ACTUELLE
    const now = new Date();
    const formattedDate = now.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const formattedTime = now.toLocaleTimeString('fr-FR');
    
    // On injecte l'heure serveur dans le prompt système
    const systemInstruction = `Tu es un assistant utile et serviable.
    Information de contexte : Nous sommes aujourd'hui le ${formattedDate} et il est exactement ${formattedTime}.
    Utilise cette information si l'utilisateur te demande la date ou l'heure.`;

    // Initialisation du modèle avec l'instruction système
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash', // Assurez-vous d'utiliser un modèle récent (1.5)
        systemInstruction: systemInstruction 
    });
    
    // Formatage de l'historique
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content || "" }], 
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    // 4. Lancer le stream
    const result = await chat.sendMessageStream(message);
    
    // Création du stream de réponse
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

          // 5. Sauvegarder la réponse complète en DB
          await supabase.from('messages').insert({
            content: fullResponse,
            role: 'model',
            user_id: user.id
          });

          controller.close();
        } catch (err) {
          console.error("Stream Error:", err);
          controller.error(err);
        }
      },
    });

    return new NextResponse(stream);

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
