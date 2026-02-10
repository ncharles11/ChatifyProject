export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Version debug - titre fixe pour tester
    const debugTitle = `Titre: ${message.split(' ').slice(0, 3).join(' ')}`;
    
    console.log('Debug - Message reçu:', message);
    console.log('Debug - Titre généré:', debugTitle);
    console.log('Debug - API Key exists:', !!process.env.GOOGLE_AI_API_KEY);

    return Response.json({ title: debugTitle });
  } catch (error) {
    console.error('Error in debug route:', error);
    return Response.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}
