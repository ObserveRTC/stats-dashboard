'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardModel } from '../../utils/dashboardModel.ts';
import {
  QUICK_PROMPTS,
  localCallAnswers,
  openingMessage,
  type CallAnswerProvider,
} from '../../utils/callAnswers.ts';
import styles from './CallChatPanel.module.css';

interface ChatMessage {
  id: number;
  role: 'user' | 'agent';
  text: string;
}

/**
 * Question-and-answer panel for the call.
 *
 * Not currently mounted — the dashboard omits it for now. Drop it back in as
 * a card in <CallDashboard> to re-enable it.
 *
 * The answering is pluggable: `answerProvider` defaults to the local
 * keyword provider in utils/callAnswers, which answers from the dashboard's
 * own view model. Pass a function that calls a real endpoint to replace it —
 * nothing else in this component changes.
 */
export function CallChatPanel({
  model,
  answerProvider = localCallAnswers,
}: {
  model: DashboardModel;
  answerProvider?: CallAnswerProvider;
}) {
  const opening = useMemo(() => openingMessage(model), [model]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || sending) return;

      setMessages((prev) => [...prev, { id: nextId.current++, role: 'user', text }]);
      setInput('');
      setSending(true);
      try {
        const answer = await answerProvider(text, model);
        setMessages((prev) => [...prev, { id: nextId.current++, role: 'agent', text: answer }]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId.current++,
            role: 'agent',
            text: err instanceof Error ? `Sorry — ${err.message}` : 'Sorry, that failed.',
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [answerProvider, model, sending],
  );

  return (
    <div className={`card elev-md ${styles.panel}`}>
      <div>
        <div className="card-title">Ask about this call</div>
        <p className="card-body" style={{ marginTop: 2 }}>
          Answers come from this session&apos;s stats, in plain language.
        </p>
      </div>

      <div className={styles.chatLog} ref={logRef}>
        <div className={styles.chatRow} style={{ alignSelf: 'flex-start' }}>
          <div className={`${styles.chatBubble} ${styles.chatBubbleAgent}`}>{opening}</div>
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            className={styles.chatRow}
            style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            <div
              className={`${styles.chatBubble} ${
                m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAgent
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}

        {sending && (
          <div className={styles.typing} aria-label="Thinking">
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
          </div>
        )}
      </div>

      <div className={styles.quickPrompts}>
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className={`tag ${styles.quickPrompt}`}
            onClick={() => ask(prompt)}
            disabled={sending}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className={styles.chatComposer}>
        <input
          className="input"
          type="text"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') ask(input);
          }}
        />
        <button
          type="button"
          className="btn btn-primary btn-icon"
          aria-label="Send"
          onClick={() => ask(input)}
          disabled={sending || input.trim().length === 0}
        >
          <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor">
            <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
