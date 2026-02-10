import { Message } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-white text-gray-800 rounded-tl-none border border-gray-200 shadow-sm'
        }`}
      >
        {isUser ? (
          // User messages - simple text or basic markdown
          <div className="prose prose-sm max-w-none prose-invert">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        ) : (
          // AI messages - full markdown with syntax highlighting
          <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-800 prose-em:text-gray-700 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-blockquote:border-l-gray-300 prose-blockquote:text-gray-600 prose-code:text-pink-600 prose-pre:bg-gray-50">
            <ReactMarkdown
              components={{
                code({ className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const isInline = !className || !match;
                  
                  return !isInline && language ? (
                    <div className="rounded-lg overflow-hidden my-2">
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={language}
                        PreTag="div"
                        className="mt-0! mb-0!"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 my-2 text-gray-700">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 my-2 text-gray-700">
                    {children}
                  </ol>
                ),
                p: ({ children }) => (
                  <p className="my-2 text-gray-700 leading-relaxed">
                    {children}
                  </p>
                ),
                a: ({ href, children }: any) => (
                  <a 
                    href={href} 
                    className="text-blue-600 hover:text-blue-700 underline transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 my-2 italic text-gray-600">
                    {children}
                  </blockquote>
                ),
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-gray-800 my-3">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold text-gray-800 my-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-gray-800 my-2">
                    {children}
                  </h3>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="min-w-full border border-gray-200 rounded-lg">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-800">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-gray-200 px-3 py-2 text-gray-700">
                    {children}
                  </td>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}