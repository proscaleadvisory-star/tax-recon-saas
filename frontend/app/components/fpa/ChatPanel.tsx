"use client";

import React, { useState } from 'react';
import { api } from './api';
import { MessageSquare, Send, Loader2, RefreshCw, Cpu } from 'lucide-react';

interface Message {
  sender: 'user' | 'cfo';
  text: string;
  engine?: string;
}

export const ChatPanel: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'cfo',
      text: "Hello, I am your local AI CFO. I analyze your SQLite ledger transactions, calculate budget coordinates, and run ARIMA forecasts. Ask me any question about your financial data.",
      engine: "Offline Math Engine"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<'connected' | 'offline'>('connected');

  const quickChips = [
    "Summarise last month variance",
    "What is my budgeted revenue for FY2024?",
    "Highlight top ledger anomaly risks",
  ];

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    const userMsg: Message = { sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askChat(text);
      
      // Update Ollama status based on engine returned
      if (res.engine.includes("Offline")) {
        setOllamaStatus('offline');
      } else {
        setOllamaStatus('connected');
      }

      setMessages(prev => [...prev, {
        sender: 'cfo',
        text: res.response,
        engine: res.engine
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        sender: 'cfo',
        text: `Error contacting local chat endpoint: ${e.message}`,
        engine: "System Alert"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        sender: 'cfo',
        text: "Hello, I am your local AI CFO. I analyze your SQLite ledger transactions, calculate budget coordinates, and run ARIMA forecasts. Ask me any question about your financial data.",
        engine: "Offline Math Engine"
      }
    ]);
  };

  return (
    <div className="p-8 h-[calc(100vh-2rem)] flex flex-col justify-between">
      {/* Chat Header */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" />
            AI CFO Chat Drawer
          </h2>
          <p className="text-gray-400 text-sm">Offline natural language interface running locally on Ollama</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2 bg-[#0f0f1b] border border-border px-3 py-1.5 rounded-lg">
            <Cpu className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold text-gray-300">LLM Mode:</span>
            {ollamaStatus === 'connected' ? (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
                Ollama Llama3
              </span>
            ) : (
              <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                Math Engine (Fallback)
              </span>
            )}
          </div>

          <button
            onClick={handleClear}
            className="p-2 text-gray-400 hover:text-white border border-border bg-card hover:bg-gray-800 rounded-lg transition-colors"
            title="Reset Chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto my-6 space-y-4 pr-2">
        {messages.map((m, idx) => {
          const isUser = m.sender === 'user';
          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl rounded-xl p-4 space-y-1.5 shadow-md ${
                isUser 
                  ? 'bg-primary text-white rounded-br-none' 
                  : 'bg-card border border-border text-gray-200 rounded-bl-none'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                {!isUser && m.engine && (
                  <div className="text-[9px] text-gray-500 text-right font-mono border-t border-border/40 pt-1">
                    Powered by: {m.engine}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl rounded-bl-none p-4 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs text-gray-400 font-mono">Compiling financial parameters...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input zone */}
      <div className="space-y-4">
        {/* Quick prompts */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              disabled={loading}
              className="text-xs text-slate-300 hover:text-indigo-300 bg-slate-900/60 hover:bg-indigo-500/10 border border-slate-800 hover:border-indigo-500/30 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer shadow-sm"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="flex gap-3 bg-[#0d0f14] border border-slate-800/80 p-2.5 rounded-xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/30 transition-all duration-200 shadow-sm">
          <input
            type="text"
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage(input);
            }}
            placeholder="Ask AI CFO: 'Summarise variance', 'What is budgeted opex?'"
            className="flex-1 bg-transparent text-sm text-white focus:outline-none px-2 py-1.5"
          />
          <button
            onClick={() => handleSendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-primary hover:bg-primaryHover text-white p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-40 cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
