import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { Message } from '../api/types';
import { cn, errorMessage, formatTime } from '../lib/util';
import { Avatar, Button } from './ui';

export type Perspective = 'customer' | 'staff';

export interface ComposerOptions {
  enabled: boolean;
  disabledReason?: string;
  placeholder?: string;
  onSend: (body: string) => Promise<void>;
}

interface TicketChatProps {
  messages: Message[];
  perspective: Perspective;
  currentAgentId?: number;
  composer: ComposerOptions;
}

export function TicketChat({ messages, perspective, currentAgentId, composer }: TicketChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastId = messages.length ? messages[messages.length - 1].id : null;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  const isMine = (m: Message) =>
    perspective === 'customer'
      ? m.authorType === 'REQUESTER'
      : m.authorType === 'AGENT' && m.agentId === currentAgentId;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-white dark:from-slate-950 via-neon-50/40 dark:via-slate-900 to-cyber-50/40 dark:to-slate-950 px-4 py-6 sm:px-6">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} mine={isMine(m)} perspective={perspective} />
        ))}
      </div>
      <Composer {...composer} />
    </div>
  );
}

function ChatMessage({ message, mine, perspective }: { message: Message; mine: boolean; perspective: Perspective }) {
  if (message.authorType === 'SYSTEM') {
    return (
      <div className="flex justify-center">
        <div className="rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700">
          {message.body} <span className="text-slate-400 dark:text-slate-400">· {formatTime(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  const isAgent = message.authorType === 'AGENT';
  const label = mine
    ? 'You'
    : isAgent
      ? perspective === 'customer'
        ? `${message.authorName} · Support`
        : message.authorName
      : perspective === 'staff'
        ? `${message.authorName} · Customer`
        : message.authorName;

  const bubble = mine
    ? 'bg-gradient-to-br from-neon-500 to-violet-500 text-white shadow-neon rounded-br-md'
    : isAgent
      ? 'bg-cyber-50 dark:bg-cyber-400/10 text-slate-900 dark:text-slate-100 ring-1 ring-cyber-300 rounded-bl-md'
      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 ring-1 ring-slate-200 dark:ring-slate-700 rounded-bl-md';

  return (
    <div className={cn('flex gap-3', mine && 'flex-row-reverse')}>
      <Avatar name={message.authorName} tone={isAgent ? 'neon' : 'cyber'} />
      <div className={cn('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
        <div className="mb-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
          <span>{formatTime(message.createdAt)}</span>
        </div>
        <div className={cn('whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm', bubble)}>
          {message.body}
        </div>
      </div>
    </div>
  );
}

function Composer({ enabled, disabledReason, placeholder, onSend }: ComposerOptions) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        {disabledReason}
      </div>
    );
  }

  const submit = async () => {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSend(text);
      setBody('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4"
    >
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex items-end gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 focus-within:border-neon-400 focus-within:ring-4 focus-within:ring-neon-100">
        <textarea
          rows={2}
          value={body}
          maxLength={10000}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder ?? 'Write a message…'}
          className="max-h-40 min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm outline-none"
        />
        <Button type="submit" size="sm" loading={sending} disabled={!body.trim()}>
          {!sending && <Send />}
          Send
        </Button>
      </div>
      <p className="mt-1.5 hidden text-xs text-slate-400 dark:text-slate-400 sm:block">Enter to send · Shift+Enter for a new line</p>
    </form>
  );
}
