'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  userName?: string;
  onNewChat: () => void;
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  refreshTrigger?: number;
}

export default function Sidebar({ isOpen, setIsOpen, userName, onNewChat, currentChatId, onChatSelect, refreshTrigger }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchChats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats, refreshTrigger]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Aujourd\'hui';
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 flex flex-col h-full border-r border-slate-800 shadow-2xl`}
      >
        <div className="p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
               AI
             </div>
             <span className="font-semibold text-white tracking-tight text-lg">Chatbot</span>
          </div>
          <button 
            onClick={() => setIsOpen(false)} 
            className="md:hidden text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-4 mb-6">
          <button 
            onClick={() => {
              onNewChat();
              setIsOpen(false);
            }} 
            className="w-full flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 rounded-xl transition-all shadow-lg shadow-indigo-900/20 group border border-indigo-500/50"
          >
            <span className="text-xl font-light group-hover:scale-110 transition-transform">+</span>
            <span className="font-medium text-sm">Nouvelle conversation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
           <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">
             Historique
           </div>
           
           {loading ? (
             <div className="space-y-1">
               {[...Array(3)].map((_, i) => (
                 <div key={i} className="px-3 py-2 rounded-lg bg-slate-800 animate-pulse">
                   <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
                   <div className="h-3 bg-slate-700 rounded w-1/2"></div>
                 </div>
               ))}
             </div>
           ) : chats.length === 0 ? (
             <div className="text-center py-8 text-slate-500 text-sm">
               Aucune conversation pour le moment
             </div>
           ) : (
             <div className="space-y-1">
               {chats.map((chat) => (
                 <button
                   key={chat.id}
                   onClick={() => {
                     onChatSelect(chat.id);
                     setIsOpen(false);
                   }}
                   className={`w-full text-left px-3 py-3 rounded-lg transition-all truncate group ${
                     currentChatId === chat.id
                       ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                       : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                   }`}
                 >
                   <div className="flex flex-col">
                     <span className="text-sm font-medium truncate">
                       {chat.title}
                     </span>
                     <span className="text-xs text-slate-500">
                       {formatDate(chat.updated_at)}
                     </span>
                   </div>
                 </button>
               ))}
             </div>
           )}
        </div>

        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 ring-2 ring-slate-800 flex items-center justify-center text-white text-xs font-bold">
               {getInitials(userName || '')}
             </div>
             <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{userName || 'Utilisateur'}</p>
                <p className="text-xs text-slate-500 truncate">En ligne</p>
             </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full gap-2 px-4 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all border border-slate-800 hover:border-red-900/50"
          >
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}