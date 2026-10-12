import { useCallback, useEffect, useRef, useState } from 'react';
import ArcReactor from './components/ArcReactor.jsx';
import ChatLog from './components/ChatLog.jsx';
import HudOverlay from './components/HudOverlay.jsx';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('SYSTEMS ONLINE');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [voiceSupported] = useState(
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [telemetry, setTelemetry] = useState(null);
  const messagesRef = useRef(messages);
  const recognitionRef = useRef(null);

  useEffect(() => {
    let active = true;
    const poll = () =>
      fetch('/api/telemetry')
        .then((r) => r.json())
        .then((data) => {
          if (active) setTelemetry(data);
        })
        .catch(() => {});
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const speak = useCallback((text) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const preferred =
        voices.find(
          (v) => /en/i.test(v.lang) && /(daniel|george|arthur|google uk english male)/i.test(v.name)
        ) ||
        voices.find((v) => /en[-_]GB/i.test(v.lang)) ||
        voices.find((v) => /en/i.test(v.lang));
      if (preferred) utterance.voice = preferred;
      utterance.pitch = 0.85;
      utterance.rate = 1.05;
      synth.speak(utterance);
    } catch {
      /* speech synthesis unavailable in this browser */
    }
  }, []);

  const send = useCallback(
    async (text) => {
      const trimmed = (text || '').trim();
      if (!trimmed || thinking) return;
      const history = [...messagesRef.current, { role: 'user', text: trimmed }];
      messagesRef.current = history;
      setMessages(history);
      setInput('');
      setThinking(true);
      setStatus('PROCESSING');
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
        const updated = [...history, { role: 'assistant', text: data.reply }];
        messagesRef.current = updated;
        setMessages(updated);
        speak(data.reply);
        setStatus('SYSTEMS ONLINE');
      } catch (error) {
        const updated = [...history, { role: 'assistant', text: error.message, isError: true }];
        messagesRef.current = updated;
        setMessages(updated);
        setStatus('ERROR DETECTED');
      } finally {
        setThinking(false);
      }
    },
    [speak, thinking]
  );

  useEffect(() => {
    if (!voiceSupported) return undefined;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript.trim();
      if (text) send(text);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      setStatus(
        event.error === 'not-allowed' ? 'MICROPHONE ACCESS DENIED' : `SENSOR FAULT: ${event.error}`
      );
    };
    recognitionRef.current = recognition;
    return () => recognition.abort();
  }, [send, voiceSupported]);

  const toggleMic = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
      setStatus('SYSTEMS ONLINE');
    } else {
      try {
        window.speechSynthesis?.cancel();
        recognition.start();
        setListening(true);
        setStatus('LISTENING');
      } catch {
        /* already started */
      }
    }
  }, [listening]);

  const handleSubmit = (event) => {
    event.preventDefault();
    send(input);
  };

  return (
    <div className="hud">
      <HudOverlay telemetry={telemetry} />
      <header className="hud-top">
        <div className="hud-title">J.A.R.V.I.S.</div>
        <div className="hud-status">
          <span className="status-dot" />
          {status}
        </div>
      </header>
      <main className="hud-main">
        <ArcReactor
          listening={listening}
          thinking={thinking}
          voiceSupported={voiceSupported}
          onToggle={toggleMic}
        />
        <ChatLog messages={messages} thinking={thinking} />
      </main>
      <form className="hud-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            voiceSupported
              ? 'Type a command, or tap the reactor to speak…'
              : 'Voice input unavailable in this browser — type here…'
          }
          aria-label="Message JARVIS"
        />
        <button type="submit" disabled={!input.trim() || thinking}>
          SEND
        </button>
      </form>
    </div>
  );
}
