'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  userName?: string;
  onNewChat: () => void;
}

export default function Sidebar({ isOpen, setIsOpen, userName, onNewChat }: SidebarProps) {
  const router = useRouter();
  const supabase = createClient();

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
           
           <div className="space-y-1">
             <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sm text-slate-400 hover:text-slate-200 transition-colors truncate flex items-center gap-2 group">
               Session actuelle
             </button>
           </div>
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