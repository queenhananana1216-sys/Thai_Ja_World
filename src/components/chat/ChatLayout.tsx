'use client';

import type { ReactNode } from 'react';
import { Send } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

type Message = {
  id: string;
  text: string;
  sender: string;
  isMine: boolean;
  time: string;
};

type Props = {
  messages: Message[];
  inputValue: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  placeholder?: string;
};

export function ChatLayout({ messages, inputValue, onInputChange, onSend, placeholder }: Props) {
  return (
    <div className="mx-auto flex h-[calc(100vh-200px)] max-w-3xl flex-col px-4 py-4">
      <ScrollArea className="flex-1 rounded-xl border-2 border-tj-line bg-tj-surface p-4 shadow-retro">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.isMine ? 'flex-row-reverse' : ''}`}
            >
              {!msg.isMine && (
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-cobalt-50 text-xs font-bold text-museum-cobalt">
                    {msg.sender.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  msg.isMine
                    ? 'bg-museum-coral text-white'
                    : 'border border-gray-200 bg-white text-tj-ink'
                }`}
              >
                <p>{msg.text}</p>
                <p className={`mt-0.5 text-[0.6rem] ${msg.isMine ? 'text-white/70' : 'text-gray-400'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="mt-3 flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
          className="border-gray-300 bg-white"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <Button size="icon" onClick={onSend} className="shrink-0 bg-museum-coral hover:bg-coral-600">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
