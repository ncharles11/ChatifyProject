import { Message } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200'
        }`}
      >
        <div className="prose prose-sm max-w-none dark:prose-invert">
           <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}