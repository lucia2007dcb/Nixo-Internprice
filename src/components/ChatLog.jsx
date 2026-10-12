import { useEffect, useRef } from 'react';

export default function ChatLog({ messages, thinking }) {
  const ref = useRef(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  return (
    <section className="chatlog" ref={ref} aria-live="polite">
      {messages.length === 0 && !thinking && (
        <div className="chatlog-empty">
          <p className="chatlog-greeting">Systems online, sir.</p>
          <p>Tap the reactor to speak, or type a command below.</p>
        </div>
      )}
      {messages.map((message, index) => (
        <div
          key={index}
          className={
            'msg msg-' + message.role + (message.isError ? ' msg-error' : '')
          }
        >
          <span className="msg-tag">{message.role === 'user' ? 'YOU' : 'J.A.R.V.I.S.'}</span>
          <p>{message.text}</p>
        </div>
      ))}
      {thinking && (
        <div className="msg msg-assistant msg-thinking">
          <span className="msg-tag">J.A.R.V.I.S.</span>
          <p>
            <span className="dot" /> <span className="dot" /> <span className="dot" />
          </p>
        </div>
      )}
    </section>
  );
}
