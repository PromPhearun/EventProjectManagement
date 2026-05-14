import { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { ChatMessage } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Send, User, MessageCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

import { Toaster } from './ui/sonner';
import { toast } from 'sonner';

export function TeamChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const currentUser = db.getCurrentUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number>(0);

  useEffect(() => {
    refreshMessages();
    setUsers(db.getUsers());

    // Polling for real-time notifications
    const interval = setInterval(() => {
      refreshMessages(true); // true means check for notifications
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const refreshMessages = (notify = false) => {
    const currentMessages = db.getChat();
    
    if (notify && currentMessages.length > lastMessageCountRef.current) {
      const newMessages = currentMessages.slice(lastMessageCountRef.current);
      newMessages.forEach(msg => {
        if (msg.sender !== currentUser.name) {
          toast(`New Message from ${msg.sender}`, {
            description: msg.text,
            icon: <MessageCircle size={14} />
          });
        }
      });
    }

    setMessages(currentMessages);
    lastMessageCountRef.current = currentMessages.length;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getUserAvatar = (name: string) => {
    const user = users.find(u => u.name === name);
    return user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${name}`;
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender: currentUser.name,
      text: inputText,
      timestamp: new Date().toISOString()
    };

    db.saveMessage(newMessage);
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight uppercase font-black">EPM Team Exchange</h2>
          <p className="text-muted-foreground italic">Internal chat box to share quick insights, alerts, and collaborate on events.</p>
        </div>
      </div>

      <Card className="h-[600px] flex flex-col overflow-hidden border-2 rounded-3xl">
        <CardHeader className="border-b bg-slate-50/50">
          <CardTitle className="flex items-center gap-2 text-md">
            <MessageCircle className="text-blue-500" /> General Workspace
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
             <div className="space-y-6">
               {messages.map((msg) => (
                 <div key={msg.id} className={`flex gap-3 ${msg.sender === currentUser.name ? 'flex-row-reverse' : 'flex-row'}`}>
                   <img 
                    src={getUserAvatar(msg.sender)} 
                    alt={msg.sender} 
                    className="w-8 h-8 rounded-full border shadow-sm shrink-0"
                    referrerPolicy="no-referrer"
                   />
                   <div className={`flex flex-col ${msg.sender === currentUser.name ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[10px] font-bold opacity-40 uppercase">{msg.sender}</span>
                      <span className="text-[9px] opacity-30">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className={`max-w-[100%] rounded-2xl px-4 py-2 text-sm shadow-sm ${msg.sender === currentUser.name ? 'bg-black text-white rounded-tr-none' : 'bg-slate-100 rounded-tl-none text-slate-800'}`}>
                      {msg.text}
                    </div>
                   </div>
                 </div>
               ))}
               {messages.length === 0 && (
                 <div className="text-center py-20 opacity-20 italic">No messages yet. Start a conversation!</div>
               )}
             </div>
          </ScrollArea>

          <div className="p-4 border-t bg-white">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <Input 
                placeholder="Type your message..." 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!inputText.trim()}>
                <Send size={18} />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
