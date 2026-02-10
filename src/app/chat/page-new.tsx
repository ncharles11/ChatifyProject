'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import SidebarNew from '@/components/SidebarNew';
import ChatInterfaceNew from '@/components/ChatInterfaceNew';

export default function ChatPage() {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Utilisateur');
      
      // Check URL for chat ID
      const urlParams = new URLSearchParams(window.location.search);
      const chatId = urlParams.get('chat');
      if (chatId) {
        setSelectedChatId(chatId);
      }
      
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    // Update URL without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('chat', chatId);
    window.history.pushState({}, '', url.toString());
  };

  const handleNewChat = () => {
    setSelectedChatId(undefined);
    // Clear chat parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('chat');
    window.history.pushState({}, '', url.toString());
  };

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId);
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('chat', chatId);
    window.history.pushState({}, '', url.toString());
    
    // Close sidebar on mobile
    setIsSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-white rounded-lg shadow-md border border-gray-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className="hidden md:block md:w-80">
        <SidebarNew
          currentChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          isOpen={false}
          setIsOpen={() => {}}
          userName={userName}
        />
      </div>

      {/* Mobile Sidebar */}
      <SidebarNew
        currentChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userName={userName}
      />

      {/* Main Content */}
      <div className="flex-1 md:ml-0">
        <ChatInterfaceNew
          chatId={selectedChatId}
          onChatCreated={handleChatCreated}
          userId={userId}
          userName={userName}
        />
      </div>
    </div>
  );
}
