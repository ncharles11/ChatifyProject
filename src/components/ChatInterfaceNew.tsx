'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '@/lib/types';
import MessageBubble from './MessageBubble';
import { createClient } from '@/lib/supabase/client';
import { Mic, MicOff } from 'lucide-react';

interface ChatInterfaceProps {
  chatId?: string;
  onChatCreated?: (chatId: string) => void;
  userId: string;
  userName: string;
}

export default function ChatInterfaceNew({ 
  chatId, 
  onChatCreated, 
  userId, 
  userName 
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);
  const [tokensPerSec, setTokensPerSec] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Fetch messages when chatId changes
  useEffect(() => {
    if (chatId && chatId !== currentChatId) {
      setCurrentChatId(chatId);
      fetchMessages(chatId);
    } else if (!chatId) {
      // Reset for new chat
      setMessages([]);
      setCurrentChatId(undefined);
    }
  }, [chatId, currentChatId]);

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const createNewChat = async (): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .insert({
          user_id: userId,
          title: 'Nouvelle conversation'
        })
        .select()
        .single();

      if (error) throw error;
      
      const newChatId = data.id;
      setCurrentChatId(newChatId);
      
      // Notify parent component
      if (onChatCreated) {
        onChatCreated(newChatId);
      }
      
      return newChatId;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  };

  const saveMessage = async (chatId: string, message: Message) => {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          role: message.role,
          content: message.content
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const generateTitle = async (chatId: string, messages: Message[]) => {
    if (messages.length < 1) return;

    try {
      const response = await fetch('/api/generate-title-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, messages }),
      });

      if (!response.ok) {
        console.error('Failed to generate title');
        return;
      }

      const result = await response.json();
      console.log('Generated title:', result.title);
    } catch (error) {
      console.error('Error generating title:', error);
    }
  };

  const sendMessage = useCallback(async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    
    const messageText = textOverride || input;
    if (!messageText.trim() || isLoading) return;

    let workingChatId = currentChatId;

    // Create new chat if none exists
    if (!workingChatId) {
      try {
        workingChatId = await createNewChat();
      } catch (error) {
        console.error('Failed to create chat:', error);
        return;
      }
    }

    const userMsg: Message = { role: 'user', content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    
    // Save user message
    await saveMessage(workingChatId, userMsg);
    
    // Clear input
    if (!textOverride) {
      setInput('');
    }
    
    setIsLoading(true);
    setTokensPerSec(0);

    const startTime = performance.now();
    let charCount = 0;
    let aiResponse = '';

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

      setMessages((prev) => [...prev, { role: 'model', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiResponse += chunk;
        charCount += chunk.length;

        const elapsedTime = (performance.now() - startTime) / 1000;
        if (elapsedTime > 0) {
          const estimatedTokens = charCount / 4;
          setTokensPerSec(estimatedTokens / elapsedTime);
        }

        setMessages((prev) => {
          const newArr = [...prev];
          if (newArr.length > 0 && newArr[newArr.length - 1].role === 'model') {
            newArr[newArr.length - 1] = { role: 'model', content: aiResponse };
          }
          return newArr;
        });
      }

      // Save AI message
      const aiMsg: Message = { role: 'model', content: aiResponse };
      await saveMessage(workingChatId, aiMsg);

      // Generate title for new chats (after first exchange)
      const updatedMessages = [...messages, userMsg, aiMsg];
      if (updatedMessages.length === 2) { // First user + AI exchange
        generateTitle(workingChatId, updatedMessages);
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
  }, [input, isLoading, messages, currentChatId, userId, onChatCreated]);

  const sendMessageWithText = useCallback((text: string) => {
    sendMessage(undefined, text);
  }, [sendMessage]);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionAPI) {
        setIsSpeechSupported(false);
        return;
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onresult = (event: any) => {
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

      recognition.onerror = (event: any) => {
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
      setInput(input);
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLoading ? 'bg-green-400' : 'hidden'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isLoading ? 'bg-green-500' : 'bg-gray-300'}`}></span>
            </span>
            <h1 className="text-lg font-semibold text-gray-800">Gemini 2.5 Flash</h1>
          </div>
          
          <div className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded border transition-colors ${
            isLoading || tokensPerSec > 0 
              ? 'text-green-600 bg-green-50 border-green-100' 
              : 'text-gray-400 bg-gray-50 border-gray-100'
          }`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.283 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
            </svg>
            {tokensPerSec.toFixed(1)} t/s
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="text-center mt-32">
            <div className="text-6xl mb-4 opacity-20">💬</div>
            <p className="text-gray-500">Bonjour {userName.split(' ')[0]}, comment puis-je vous aider ?</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border border-gray-200 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tapez votre message..."
              className="w-full px-4 py-3 pr-24 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            
            {isSpeechSupported && (
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`absolute right-12 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-colors ${
                  isListening 
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isListening ? "Arrêter l'enregistrement" : "Démarrer la reconnaissance vocale"}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}
            
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </form>
        <p className="text-center text-xs text-gray-400 mt-2">
          L'IA peut faire des erreurs. Vérifiez les informations importantes.
        </p>
      </div>
    </div>
  );
}
