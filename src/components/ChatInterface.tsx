'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '@/lib/types';
import MessageBubble from './MessageBubble';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { Mic, MicOff } from 'lucide-react';

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  error: string;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
} 

export default function ChatInterface({ 
  initialMessages, 
  userId, 
  userName 
}: { 
  initialMessages: Message[], 
  userId: string,
  userName: string 
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tokensPerSec, setTokensPerSec] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = useCallback(async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    
    // Only clear input if we're not using textOverride (voice input)
    if (!textOverride) {
      setInput('');
    }
    
    setIsLoading(true);
    setTokensPerSec(0); 

    const startTime = performance.now();
    let charCount = 0;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content, history: messages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur serveur: ${response.status}`);
      }

      if (!response.body) throw new Error('No body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiMsgContent = '';

      setMessages((prev) => [...prev, { role: 'model', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiMsgContent += chunk;
        charCount += chunk.length;

        const elapsedTime = (performance.now() - startTime) / 1000;
        if (elapsedTime > 0) {
            const estimatedTokens = charCount / 4; 
            setTokensPerSec(estimatedTokens / elapsedTime);
        }

        setMessages((prev) => {
          const newArr = [...prev];
          if (newArr.length > 0 && newArr[newArr.length - 1].role === 'model') {
             newArr[newArr.length - 1] = { role: 'model', content: aiMsgContent };
          }
          return newArr;
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error:', error);
        alert(`Erreur : ${error.message}`);
      } else {
        console.error('Unknown error:', error);
        alert('Une erreur inconnue est survenue.');
      }
    } finally {
      setIsLoading(false);
      // Clear input after voice message is sent
      if (textOverride) {
        setInput('');
      }
    }
  }, [input, isLoading, messages]);

  const sendMessageWithText = useCallback((text: string) => {
    sendMessage(undefined, text);
  }, [sendMessage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        setIsSpeechSupported(false);
        return;
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Build the complete transcript from scratch on every callback
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript = transcript;
          }
        }

        // Combine base input with new speech
        const baseInput = input;
        const fullTranscript = (baseInput + ' ' + finalTranscript + interimTranscript).trim();

        // Always overwrite the input state, never append
        setInput(fullTranscript);

        // Auto-send when we have final results
        if (finalTranscript.trim()) {
          setIsListening(false);
          recognitionRef.current?.stop();
          
          // Send the complete message
          setTimeout(() => {
            sendMessageWithText(fullTranscript);
          }, 100);
        }
      };

      recognition.onerror = (event: SpeechRecognitionEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [sendMessageWithText, input]);

  const toggleSpeechRecognition = () => {
    if (!isSpeechSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      // Clear any previous speech input and start fresh
      setInput(input); // Keep existing typed text
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setTokensPerSec(0);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      <Sidebar 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        userName={userName}
        onNewChat={handleNewChat} onChatSelect={function (chatId: string): void {
          throw new Error('Function not implemented.');
        } }      />

      <div className="flex-1 flex flex-col h-full relative w-full transition-all duration-300">
        
        <header className="h-16 absolute top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLoading ? 'bg-emerald-400' : 'hidden'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isLoading ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
              </span>
              <h1 className="font-semibold text-slate-700">Gemini 2.5 Flash</h1>
            </div>
          </div>
          
          <div className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border whitespace-nowrap transition-colors ${
            isLoading || tokensPerSec > 0 
              ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
              : 'text-slate-400 bg-slate-50 border-slate-100'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.283 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
            </svg>
            {tokensPerSec.toFixed(1)} t/s
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-20 pb-4 px-4 md:px-8 space-y-6 scroll-smooth">
          <div className="max-w-3xl mx-auto w-full">
            {messages.length === 0 && (
              <div className="text-center mt-32 opacity-50 select-none">
                <div className="text-6xl mb-4 grayscale"></div>
                <p className="text-slate-500 font-medium">Bonjour {userName.split(' ')[0]}, posez une question pour démarrer...</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-message">
                 <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <div className="p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={sendMessage} className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Discutez avec Gemini..."
                className="w-full p-4 pr-28 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-400"
              />
              
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`absolute right-14 top-2 bottom-2 aspect-square rounded-xl transition-all flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 active:scale-95 ${
                    isListening 
                      ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={isListening ? "Arrêter l'enregistrement" : "Démarrer la reconnaissance vocale"}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
              )}
              
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            </form>
            <div className="text-center mt-3">
               <p className="text-[10px] text-slate-400 font-medium">L&apos;IA peut faire des erreurs. Vérifiez les informations.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}