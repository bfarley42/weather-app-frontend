/**
 * WeatherChatbot.tsx
 * 
 * A conversational interface for querying weather data using natural language.
 * UPDATED: Now sends user's timezone for correct "today"/"yesterday" handling
 */

import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import './WeatherChatbot.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface ChatResponse {
  answer: string;
  sql_query?: string;
  raw_data?: Record<string, unknown>[];
  error?: string;
}

interface WeatherChatbotProps {
  apiBaseUrl?: string;
  darkMode?: boolean;
}

const EXAMPLE_QUESTIONS = [
  "What was the hottest day in Sitka in 2024?",
  "How much snow did Juneau get in 2019?",
  "Show me the coldest days in Alaska this winter",
  "What's the average rainfall in Seattle in April?",
  "Top 10 snowiest days in Michigan last year",
];

// ============================================================
// ADD THIS FUNCTION - Gets user's timezone from browser
// ============================================================
const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/Anchorage"; // Fallback for Alaska users
  }
};

export default function WeatherChatbot({ apiBaseUrl = '', darkMode = true }: WeatherChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const sendMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ============================================================
        // UPDATED: Now includes timezone in the request body
        // ============================================================
        body: JSON.stringify({ 
          question: question.trim(),
          timezone: getUserTimezone(),  // <-- ADDED THIS LINE
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.answer,
        sql: data.sql_query,
        timestamp: new Date(),
      };

      // Replace loading message with actual response
      setMessages((prev) => [...prev.slice(0, -1), assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: "Sorry, I couldn't process that request. Please check your connection and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleExampleClick = (question: string) => {
    sendMessage(question);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatContent = (content: string) => {
    // Simple markdown-like formatting for bold text
    return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };


  
  return (
    <div className={`weather-chatbot ${darkMode ? 'dark' : 'light'}`}>
      <div className="chatbot-header">
        <div className="header-title">
          <svg className="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h2>Weather Assistant</h2>
        </div>
        <div className="header-actions">
          <label className="sql-toggle">
            <input
              type="checkbox"
              checked={showSql}
              onChange={(e) => setShowSql(e.target.checked)}
            />
            <span>Show SQL</span>
          </label>
          {messages.length > 0 && (
            <button className="clear-btn" onClick={clearChat} title="Clear chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="chatbot-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3>Ask me about weather data</h3>
            <p>I can query historical weather observations from thousands of stations.</p>
            <div className="example-questions">
              <span className="examples-label">Try asking:</span>
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="example-btn"
                  onClick={() => handleExampleClick(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.role}`}>
                <div className="message-content">
                  {message.isLoading ? (
                    <div className="loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    <>
                      <div
                        className="message-text"
                        dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                      />
                      {showSql && message.sql && (
                        <div className="sql-block">
                          <div className="sql-header">
                            <span>Generated SQL</span>
                            <button
                              className="copy-btn"
                              onClick={() => navigator.clipboard.writeText(message.sql || '')}
                              title="Copy SQL"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                          </div>
                          <pre><code>{message.sql}</code></pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="chatbot-input-area">
        <div className="input-container">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a weather question..."
            rows={1}
            disabled={isLoading}
          />
          <button
            className="send-btn"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <div className="input-hint">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}