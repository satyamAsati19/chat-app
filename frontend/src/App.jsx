import React, { useState, useEffect, useRef } from 'react';
import { Send, UserCircle2, Users, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : 'http://127.0.0.1:8000';
const WS_URL = import.meta.env.VITE_WS_URL ? import.meta.env.VITE_WS_URL : 'ws://127.0.0.1:8000/ws/chat';

function App() {
  const [nickname, setNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [error, setError] = useState(null);

  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connect to WebSocket
  const connectWebSocket = () => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      const socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        setError(null);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'users_count') {
            setOnlineCount(data.count);
          } else if (data.type === 'message') {
            setMessages((prev) => [...prev, data.message]);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        // Simple reconnect logic
        if (isJoined) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, 3000);
        }
      };

      socket.onerror = () => {
        setError('Connection to server lost. Trying to reconnect...');
      };

      ws.current = socket;
    } catch (err) {
      setError('Failed to connect to server.');
    }
  };

  useEffect(() => {
    if (isJoined) {
      // Fetch initial history
      fetch(`${API_URL}/messages`)
        .then((res) => res.json())
        .then((data) => {
          setMessages(data);
          connectWebSocket();
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to fetch message history.');
          connectWebSocket(); // still try to connect WS
        });
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isJoined]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      setIsJoined(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim() || ws.current?.readyState !== WebSocket.OPEN) return;

    const payload = {
      nickname: nickname,
      content: inputValue,
    };

    ws.current.send(JSON.stringify(payload));
    setInputValue('');
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-50 font-sans">
        <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Global Chat</h1>
            <p className="text-slate-400">Join the real-time conversation</p>
          </div>
          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-slate-300 mb-2">
                Choose a Nickname
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserCircle2 className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-black border border-zinc-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your nickname..."
                  autoFocus
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
            >
              Join Chat
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans flex flex-col items-center">

      <div className="w-full max-w-4xl h-screen flex flex-col shadow-2xl bg-zinc-900 border-x border-zinc-800">

        {/* Header */}
        <header className="px-6 py-4 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center shadow-sm z-10">
          <div>
            <h1 className="text-xl font-bold text-white">Global Chat</h1>
            <p className="text-xs text-slate-400">Logged in as <span className="text-blue-400 font-medium">{nickname}</span></p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">{onlineCount} online</span>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 text-red-400 p-3 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Messages */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 italic">
              No messages yet. Be the first to say hi!
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.nickname === nickname;
              const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              // Only slightly different logic if it's our own message
              return (
                <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    {!isMe && <span className="text-sm font-medium text-slate-300">{msg.nickname}</span>}
                    <span className="text-xs text-slate-500">{time}</span>
                  </div>
                  <div className={`px-4 py-2.5 rounded-2xl max-w-[85%] md:max-w-[70%] text-[15px] leading-relaxed break-words shadow-sm ${isMe
                    ? 'bg-indigo-600 text-white rounded-tr-sm shadow-lg shadow-indigo-500/20'
                    : 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
                    }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input Area */}
        <div className="p-4 bg-slate-800 border-t border-slate-700">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-black border border-zinc-800 text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-500 transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-3 rounded-xl flex-shrink-0 transition-all active:scale-95 shadow-md shadow-blue-500/20"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;
