'use client';

import { useEffect, useRef, useState } from 'react';

// Voice-first composer. Uses the browser's native Web Speech API —
// no external transcription service. Chrome, Edge, Safari (en-US); Firefox
// falls back to typing.
//
// State model:
//   `text`    — everything committed to the box (typed + final transcripts)
//   `interim` — live partial transcript shown, never submitted
export default function Composer({ onSend, thinking }) {
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [speechNotice, setSpeechNotice] = useState('');
  const [micError, setMicError] = useState('');

  const recognitionRef = useRef(null);
  const baseRef = useRef('');
  const spokeRef = useRef(false);
  const listeningRef = useRef(false);

  const displayed = text || interim;
  const canSend = !thinking && (text.trim().length > 0 || listening);

  const clearDictation = () => {
    baseRef.current = '';
    spokeRef.current = false;
    setInterim('');
  };

  // Send the finished thought. `putBack` lets Home return the words to the box
  // when something fails — a spoken thought is never lost to retyping.
  const submit = (rawText) => {
    stopRecognition(false);
    setListening(false);
    setText('');
    clearDictation();
    onSend(rawText, (value) => setText(value));
  };

  // Submit the transcript automatically when speech ends (button, send key,
  // or component unmount) — but only if something final was actually spoken.
  const stopListening = () => {
    if (spokeRef.current && text.trim()) {
      submit(text.trim());
    } else {
      stopRecognition(false);
      setListening(false);
      setInterim('');
    }
  };

  const stopRecognition = (graceful) => {
    const recognizer = recognitionRef.current;
    if (recognizer && listeningRef.current) {
      listeningRef.current = false;
      if (graceful) {
        try {
          recognizer.stop();
        } catch {
          /* already stopped */
        }
      } else {
        recognizer.onend = null;
        recognizer.onresult = null;
        recognizer.onerror = null;
        try {
          recognizer.abort();
        } catch {
          /* already stopped */
        }
      }
    }
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechNotice(
        "This browser can't listen in. Type it instead and I'll still organize it."
      );
      return;
    }
    setSpeechNotice('');
    setMicError('');
    if (listeningRef.current) {
      stopListening();
      return;
    }

    const recognizer = new SpeechRecognition();
    recognitionRef.current = recognizer;
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = 'en-US';

    baseRef.current = text.trim();
    spokeRef.current = false;
    listeningRef.current = true;

    recognizer.onresult = (event) => {
      let partial = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          spokeRef.current = true;
          partial = '';
          setText(
            `${baseRef.current ? `${baseRef.current} ` : ''}${result[0].transcript}`.trim()
          );
        } else {
          partial += result[0].transcript;
        }
      }
      setInterim(partial.trim());
    };
    recognizer.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError(
          'The mic is blocked for this site. Allow it in the address bar, or just type.'
        );
      } else {
        // end/speech/no-speech — just release the listening UI
      }
      stopRecognition(false);
      setListening(false);
      setInterim('');
    };
    recognizer.onend = () => {
      // Chrome ends steady listening on its own; picking up again keeps the
      // session alive for long rambles.
      if (listeningRef.current) {
        try {
          recognizer.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    try {
      recognizer.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  useEffect(() => () => {
    // Unmount just kills the recognizer; submitting during unmount turnover
    // would fire a network write against a dying component.
    if (listeningRef.current) stopRecognition(false);
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!canSend) return;
      if (listeningRef.current) {
        stopListening();
      } else {
        submit(text);
      }
    }
  };

  return (
    <div
      className={`sticky bottom-4 z-20 rounded-[24px] bg-card border ${
        listening ? 'border-[hsl(18_54%_47%)]/50' : 'border-border/70'
      } paper-shadow transition-colors`}
    >
      <div className="rounded-[24px] border border-border/40 bg-white/40 p-3">
        {listening ? (
          <div className="flex items-center justify-center gap-1 pb-2" aria-hidden="true">
            {[0.9, 0.6, 1, 0.7, 0.85, 0.5].map((delay, i) => (
              <span
                key={i}
                className="wave-bar w-[3px] h-4"
                style={{ animationDelay: `${delay * 0.2}s` }}
              />
            ))}
            <span className="sr-only">Listening</span>
          </div>
        ) : null}
        <textarea
          value={displayed}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={listening ? 4 : 3}
          placeholder="Talk or type it out — 'I have to book the dentist before Friday, that report is due…'"
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <div className="flex items-center justify-between mt-1">
          <button
            type="button"
            onClick={startListening}
            aria-pressed={listening}
            title={listening ? 'Stop & send' : 'Start talking'}
            className="h-10 w-10 rounded-full grid place-items-center transition-colors duration-150 ease-out hover:bg-muted active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(18_54%_45%)]/40"
            style={{ color: listening ? 'hsl(18 54% 47%)' : 'hsl(28 9% 43%)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" strokeLinecap="round" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" />
              <path d="M12 19v3" strokeLinecap="round" />
            </svg>
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={() => (listening ? stopListening() : submit(text))}
            className="px-5 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium grid place-items-center transition-opacity duration-150 ease-out hover:opacity-90 disabled:opacity-40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {thinking ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" aria-hidden="true" />
                organizing…
              </span>
            ) : listening ? (
              'Send the ramble'
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
      {speechNotice ? <p className="px-4 py-2 text-xs text-muted-foreground">{speechNotice}</p> : null}
      {micError ? <p className="px-4 py-2 text-xs" style={{ color: 'hsl(18 54% 47%)' }}>{micError}</p> : null}
    </div>
  );
}
