export default function ArcReactor({ listening, thinking, voiceSupported, onToggle }) {
  const className = [
    'reactor',
    listening ? 'reactor-listening' : '',
    thinking ? 'reactor-thinking' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const label = listening ? 'LISTENING…' : thinking ? 'THINKING…' : 'TAP TO TALK';

  return (
    <div
      className={className}
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onToggle();
      }}
      title={voiceSupported ? 'Tap to talk' : 'Voice input not supported in this browser'}
      aria-label="Toggle microphone"
    >
      <div className="ring ring-1" />
      <div className="ring ring-2" />
      <div className="ring ring-3" />
      <div className="core">
        <div className="core-inner" />
      </div>
      <div className="reactor-label">{voiceSupported ? label : 'VOICE OFFLINE'}</div>
    </div>
  );
}
