import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, useTreeStore, useUIStore } from '../../../store';
import { sendPrompt, streamPrompt, getChatHistory } from '../../../services';
import { useMutation, useQuery } from '@tanstack/react-query';

function ChatMessage({ message, onRetry }) {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-adobe-accent' : 'bg-adobe-border'
      }`}>
        {isUser ? (
          <span className="text-xs font-bold text-white">U</span>
        ) : (
          <span className="text-xs font-bold text-adobe-text">AI</span>
        )}
      </div>
      
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-adobe-accent text-white' 
            : 'bg-adobe-panel border border-adobe-border text-adobe-text'
        }`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {!isUser && message.image_url && (
          <div className="mt-2">
            <img 
              src={message.image_url} 
              alt="Generated" 
              className="max-w-full rounded-md border border-adobe-border"
            />
          </div>
        )}
        
        {!isUser && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs text-adobe-textMuted hover:text-adobe-text flex items-center gap-1"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        )}
        
        <p className="text-xs text-adobe-textMuted mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-adobe-border flex items-center justify-center">
        <span className="text-xs font-bold text-adobe-text">AI</span>
      </div>
      <div className="bg-adobe-panel border border-adobe-border rounded-lg px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-adobe-textMuted rounded-full animate-bounce"></span>
          <span className="w-2 h-2 bg-adobe-textMuted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
          <span className="w-2 h-2 bg-adobe-textMuted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        </div>
      </div>
    </motion.div>
  );
}

function ChatPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const { messages, addMessage, setTyping, isTyping } = useChatStore();
  const { activeNodeId } = useTreeStore();
  const { addNotification } = useUIStore();
  const { data: projectId } = useQuery({ queryKey: ['project'] });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: ({ prompt, nodeId }) => sendPrompt(prompt, nodeId),
    onSuccess: (data) => {
      addMessage({
        id: data.message_id,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        image_url: data.image_url,
      });
      setTyping(false);
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Chat Error',
        message: error.message || 'Failed to send message',
      });
      setTyping(false);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeNodeId) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setInput('');
    setTyping(true);

    chatMutation.mutate({
      prompt: input.trim(),
      nodeId: activeNodeId,
    });
  };

  const handleRetry = (messageId) => {
    // Retry logic would be implemented here
    addNotification({
      type: 'info',
      title: 'Retry',
      message: 'Retrying last request...',
    });
  };

  return (
    <div className="h-full flex flex-col bg-adobe-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b border-adobe-border">
        <h3 className="text-sm font-semibold text-adobe-text">AI Assistant</h3>
        <p className="text-xs text-adobe-textMuted mt-0.5">
          Describe what you want to do with your image
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <p className="text-adobe-textMuted text-sm mb-2">No messages yet</p>
              <p className="text-adobe-textMuted text-xs">
                Start a conversation by describing your edit
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={() => handleRetry(message.id)}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-adobe-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your edit..."
            disabled={chatMutation.isPending || !activeNodeId}
            className="flex-1 input-field text-sm"
          />
          <button
            type="submit"
            disabled={chatMutation.isPending || !input.trim() || !activeNodeId}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {chatMutation.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
        {!activeNodeId && (
          <p className="text-xs text-adobe-warning mt-2">
            Select a version from the tree to start editing
          </p>
        )}
      </div>
    </div>
  );
}

export default ChatPanel;
