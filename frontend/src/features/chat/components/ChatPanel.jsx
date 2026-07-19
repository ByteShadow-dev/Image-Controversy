import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, RefreshCw, Wand2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { useChatStore, useTreeStore, useUIStore } from '../../../store';
import { apiClient } from '../../../services';
import { useMutation } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a backend image_path (absolute disk path) into a URL the browser
 * can load.  The FastAPI backend mounts /uploads → the uploads directory.
 */
function resolveImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Extract just the filename from the absolute Windows/Unix path
  const filename = imagePath.split(/[\\/]/).pop();
  return `http://localhost:8000/uploads/${filename}`;
}

/**
 * Builds a human-friendly reply from the returned ImageNode.
 */
function buildReplyContent(newNode, instruction) {
  const category = newNode.edit?.category || 'Edit';
  const operation = newNode.edit?.operation || instruction;
  return `✅ **${category}** applied successfully.\n\n_${operation}_`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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
          <Wand2 size={14} className="text-adobe-text" />
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

        {message.image_url && (
          <div className="mt-2">
            <img
              src={message.image_url}
              alt="Processed result"
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
        <Wand2 size={14} className="text-adobe-text" />
      </div>
      <div className="bg-adobe-panel border border-adobe-border rounded-lg px-4 py-3">
        <div className="flex gap-1 items-center">
          <span className="text-xs text-adobe-textMuted mr-2">Processing…</span>
          <span className="w-2 h-2 bg-adobe-textMuted rounded-full animate-bounce" />
          <span className="w-2 h-2 bg-adobe-textMuted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
          <span className="w-2 h-2 bg-adobe-textMuted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

function ChatPanel() {
  const { projectId } = useParams();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const { messages, addMessage, setTyping, isTyping } = useChatStore();
  const { activeNodeId, addNode, setActiveNode, expandedNodes, toggleExpand } = useTreeStore();
  const { addNotification } = useUIStore();

  // Track the last prompt so the retry handler can re-use it
  const lastPromptRef = useRef('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // -------------------------------------------------------------------------
  // Mutation — calls POST /api/images/{projectId}/{nodeId}/edit
  // -------------------------------------------------------------------------

  const chatMutation = useMutation({
    mutationFn: async ({ prompt, nodeId }) => {
      const response = await apiClient.post(
        `/images/${projectId}/${nodeId}/edit`,
        { instruction: prompt },
        { timeout: 120_000 }   // background removal can take up to ~60 s
      );
      return response.data;
    },

    onSuccess: (newNode, { prompt }) => {
      const newNodeId = newNode.id || newNode._id;
      const parentNodeId = newNode.parent_id;
      const imageUrl = resolveImageUrl(newNode.image_path);

      // Add AI reply with the edited image
      addMessage({
        id: `reply-${newNodeId}`,
        role: 'assistant',
        content: buildReplyContent(newNode, prompt),
        timestamp: new Date().toISOString(),
        image_url: imageUrl,
      });

      // Insert the new node into the version tree under its parent
      const formattedNode = {
        id: newNodeId,
        name: newNode.edit?.operation || prompt,
        type: 'edit',
        image_path: newNode.image_path,
        status: newNode.status,
        nodeData: newNode,
        children: [],
      };

      addNode(parentNodeId, formattedNode);

      // Expand the parent so the new child is visible, then select the new node
      if (parentNodeId && !expandedNodes.has(parentNodeId)) {
        toggleExpand(parentNodeId);
      }
      setActiveNode(newNodeId);
      setTyping(false);
    },

    onError: (error) => {
      const detail = error.response?.data?.detail || error.message || 'Failed to edit image';
      addMessage({
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ Edit failed: ${detail}`,
        timestamp: new Date().toISOString(),
      });
      addNotification({
        type: 'error',
        title: 'Edit Failed',
        message: detail,
      });
      setTyping(false);
    },
  });

  // -------------------------------------------------------------------------
  // Submit handler
  // -------------------------------------------------------------------------

  const runEdit = (prompt) => {
    if (!prompt.trim() || !activeNodeId) return;

    lastPromptRef.current = prompt;

    addMessage({
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
    });

    setTyping(true);
    chatMutation.mutate({ prompt: prompt.trim(), nodeId: activeNodeId });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runEdit(input.trim());
    setInput('');
  };

  const handleRetry = () => {
    if (lastPromptRef.current) {
      runEdit(lastPromptRef.current);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="h-full flex flex-col bg-adobe-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b border-adobe-border">
        <h3 className="text-sm font-semibold text-adobe-text flex items-center gap-2">
          <Wand2 size={14} className="text-adobe-accent" />
          AI Assistant
        </h3>
        <p className="text-xs text-adobe-textMuted mt-0.5">
          Describe what you want to do with the selected image
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <Wand2 size={28} className="mx-auto mb-3 text-adobe-textMuted opacity-50" />
              <p className="text-adobe-textMuted text-sm mb-1">No messages yet</p>
              <p className="text-adobe-textMuted text-xs">
                Select a node in the tree, then describe your edit
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={message.role === 'assistant' ? handleRetry : null}
              />
            ))}
            <AnimatePresence>
              {isTyping && <TypingIndicator key="typing" />}
            </AnimatePresence>
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
            placeholder={activeNodeId ? 'Describe your edit…' : 'Select a node first…'}
            disabled={chatMutation.isPending || !activeNodeId}
            className="flex-1 input-field text-sm"
          />
          <button
            type="submit"
            disabled={chatMutation.isPending || !input.trim() || !activeNodeId}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send"
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
            ⚠ Select a version from the tree to start editing
          </p>
        )}
      </div>
    </div>
  );
}

export default ChatPanel;
