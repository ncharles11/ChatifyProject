import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';

export default async function ChatPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur';

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  return (
    <main className="h-screen bg-gray-50">
      <ChatInterface 
        initialMessages={messages || []} 
        userId={user.id} 
        userName={userName}
      />
    </main>
  );
}