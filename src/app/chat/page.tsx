import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ChatInterfaceWithHistory from '@/components/ChatInterfaceWithHistory';

export default async function ChatPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur';

  return (
    <main className="h-screen bg-gray-50">
      <ChatInterfaceWithHistory 
        initialMessages={[]} 
        userId={user.id} 
        userName={userName}
      />
    </main>
  );
}