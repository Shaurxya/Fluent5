"use client";

import { useEffect, useRef, useState } from "react";

interface RecognitionEvent { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } } }
interface Recognition {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: RecognitionEvent) => void) | null; onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null; start(): void; stop(): void;
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function SpeechRecorder({ seconds = 90, onComplete, targets = [], recordAudio = false }: { seconds?: number; onComplete: (text: string, duration: number | null) => void; targets?: string[]; recordAudio?: boolean }) {
  const [status, setStatus] = useState<"ready" | "starting" | "recording" | "stopped">("ready");
  const [locale, setLocale] = useState("en-IN");
  const [text, setText] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const running = useRef(false);
  const final = useRef("");
  const current = useRef("");
  const started = useRef(0);
  const duration = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingUrl = useRef<string | null>(null);
  const [playback, setPlayback] = useState<string | null>(null);

  function stopAudio() {
    if (media.current?.state === "recording") media.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }

  function stop() {
    running.current = false;
    if (timer.current) clearInterval(timer.current);
    recognition.current?.stop();
    stopAudio();
    duration.current = Math.max(0.1, Math.min(seconds, (performance.now()-started.current)/1000));
    setStatus("stopped");
  }
  useEffect(() => () => { running.current = false; recognition.current?.stop(); if (timer.current) clearInterval(timer.current); if (media.current) media.current.onstop = null; stopAudio(); if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current); }, []);

  async function start() {
    setError("");
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition && !recordAudio) { setError("Live transcription is unavailable in this browser. Use Chrome/Edge, or type a practice response below. Typed text has no measured speaking pace."); return; }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (recordAudio) {
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        media.current = recorder;
        const blobs: Blob[] = [];
        recorder.ondataavailable = (event) => { if (event.data.size) blobs.push(event.data); };
        recorder.onstop = () => {
          if (recordingUrl.current) URL.revokeObjectURL(recordingUrl.current);
          recordingUrl.current = URL.createObjectURL(new Blob(blobs, { type: recorder.mimeType }));
          setPlayback(recordingUrl.current);
        };
        recorder.start();
      } else stream.getTracks().forEach((t) => t.stop());
      const instance = SpeechRecognition ? new SpeechRecognition() : null;
      recognition.current = instance;
      if (instance) {
      instance.continuous = true; instance.interimResults = true; instance.lang = locale;
      final.current = ""; current.current = ""; setText(""); setElapsed(0); duration.current = null;
      instance.onresult = (event) => {
        let interim = "";
        for (let i=event.resultIndex; i<event.results.length; i++) {
          if (event.results[i].isFinal) final.current += event.results[i][0].transcript + " ";
          else interim += event.results[i][0].transcript;
        }
        current.current = final.current + interim; setText(current.current);
      };
      instance.onend = () => { if (running.current) { try { instance.start(); } catch { /* already restarting */ } } };
      instance.onerror = (e) => {
        if (["no-speech", "aborted"].includes(e.error)) return;
        running.current = false; if (timer.current) clearInterval(timer.current);
        stopAudio();
        duration.current = Math.max(0.1, (performance.now()-started.current)/1000);
        setStatus("stopped"); setError(`Transcription stopped (${e.error}). Check microphone access or your connection, then retry. Your recognized words are kept.`);
      };
      } else setError("Audio is recording locally. This browser cannot transcribe it; type the recognized words after stopping for a text-only comparison.");
      started.current = performance.now(); running.current = true;
      instance?.start(); setStatus("recording");
      timer.current = setInterval(() => { const value = (performance.now()-started.current)/1000; setElapsed(Math.min(seconds, Math.floor(value))); if (value >= seconds) stop(); }, 250);
    } catch { running.current = false; stopAudio(); setStatus("ready"); setError("Microphone access was denied or unavailable. Allow access and retry, or type your response below."); }
  }
  return <div className="nlp-panel space-y-4">
    <div className="flex justify-between items-center gap-4"><p role="status" className="font-medium">{status === "recording" ? "● Listening & transcribing" : status === "starting" ? "Opening microphone…" : "Speaking practice"}</p><span className="font-mono text-accent" aria-label="Time remaining">{Math.floor((seconds-elapsed)/60)}:{String((seconds-elapsed)%60).padStart(2,"0")}</span></div>
    <label className="text-sm flex gap-3 items-center">Recognition language<select className="nlp-input w-auto" value={locale} disabled={status === "recording" || status === "starting"} onChange={(e) => setLocale(e.target.value)}><option value="en-IN">English (India)</option><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option></select></label>
    <label className="block text-sm">Your response<textarea aria-label="Your spoken response" className="nlp-input mt-2 min-h-40" maxLength={12000} value={text} disabled={status === "recording" || status === "starting"} placeholder="Speak to transcribe, or type if speech recognition is unavailable." onChange={(e) => { setText(e.target.value); current.current = e.target.value; duration.current = null; }} /></label>
    {targets.length > 0 && <div className="flex flex-wrap gap-2">{targets.map((t) => <span key={t} className="text-xs border border-border rounded-lg p-2">{text.toLowerCase().includes(t.toLowerCase()) ? "✓ " : "○ "}{t}</span>)}</div>}
    {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
    {playback && <div><p className="text-sm mb-2">Your recording — local playback only</p><audio className="w-full" controls src={playback} aria-label="Your shadowing recording" /></div>}
    <p className="text-xs text-foreground-muted">Microphone audio is used by your browser’s recognition provider. FluentFive does not upload or store audio here. Recognized text is sent for analysis when you choose Continue.</p>
    <div className="flex flex-wrap gap-3">{status !== "recording" && <button type="button" className="nlp-button" disabled={status === "starting"} onClick={start}>{status === "stopped" ? "Record again" : "Start speaking"}</button>}{status === "recording" && <button type="button" className="nlp-button bg-red-600" onClick={stop}>Stop recording</button>}
    <button type="button" className="nlp-button" disabled={!text.trim() || status === "recording" || status === "starting"} onClick={() => onComplete(text.trim(), duration.current)}>Continue to analysis</button></div>
  </div>;
}
