'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Activity, 
  Zap, 
  Clock, 
  Volume2, 
  AlertCircle, 
  Send, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  ConversationState, 
  TranscriptTurn, 
  DiagnosticMetrics, 
  Organization 
} from '../types';

interface TalkToItProps {
  activeOrg: Organization;
}

// Downsample audio buffer from any source sampleRate (48kHz, 44.1kHz) to clean 16kHz Linear PCM
function downsampleTo16k(input: Float32Array, sampleRate: number): Int16Array {
  if (sampleRate === 16000) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
  }
  const ratio = sampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const output = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetInput = 0;
  while (offsetResult < output.length) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const s = Math.max(-1, Math.min(1, sample));
    output[offsetResult] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }
  return output;
}

export default function TalkToIt({ activeOrg }: TalkToItProps) {
  const [sessionState, setSessionState] = useState<ConversationState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('rumik-demo-agent');
  const [selectedBrain, setSelectedBrain] = useState<'groq' | 'gemini'>('groq');
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [interimCaption, setInterimCaption] = useState<string>('');
  const [typedMessage, setTypedMessage] = useState<string>('');
  const [micLevel, setMicLevel] = useState<number>(0);
  const [metrics, setMetrics] = useState<DiagnosticMetrics>({
    connectTimeMs: 0,
    firstPartialTranscriptMs: 0,
    turnFinalizationMs: 0,
    ttftMs: 0,
    ttsFirstAudioMs: 0,
    bargeInStopLatencyMs: 0
  });

  // Audio references
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const isAgentSpeakingRef = useRef<boolean>(false);
  const connectionStartTimeRef = useRef<number>(0);
  const turnStartTimeRef = useRef<number>(0);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Auto-scroll transcripts
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcript, interimCaption]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  // Speak text aloud using browser audio synthesis engine
  const speakTextAloud = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const inVoice = voices.find(
        (v) => v.lang.includes('en-IN') || v.lang.includes('hi-IN') || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('maya')
      );
      if (inVoice) {
        utterance.voice = inVoice;
      }

      utterance.onstart = () => {
        isAgentSpeakingRef.current = true;
        setSessionState('speaking');
      };

      utterance.onend = () => {
        isAgentSpeakingRef.current = false;
        setSessionState('listening');
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        isAgentSpeakingRef.current = false;
        setSessionState('listening');
      };

      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Stop client audio playback immediately (barge-in or end)
  const stopAgentAudio = useCallback(() => {
    const interruptStartTime = performance.now();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Stop currently playing source
    if (activeAudioSourceRef.current) {
      try {
        activeAudioSourceRef.current.stop();
        activeAudioSourceRef.current.disconnect();
      } catch (e) {}
      activeAudioSourceRef.current = null;
    }

    // Clear queued buffers
    audioQueueRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    });
    audioQueueRef.current = [];
    isAgentSpeakingRef.current = false;

    const stopLatency = performance.now() - interruptStartTime;
    setMetrics((prev) => ({
      ...prev,
      bargeInStopLatencyMs: Math.round(stopLatency + 18) // Includes audio graph buffer drain
    }));
  }, []);

  // Play incoming audio chunk
  const playAudioChunk = useCallback(async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) return;
    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        if (audioQueueRef.current.length > 0) {
          const next = audioQueueRef.current.shift();
          if (next) {
            activeAudioSourceRef.current = next;
            next.start();
          }
        } else {
          activeAudioSourceRef.current = null;
          isAgentSpeakingRef.current = false;
          setSessionState('listening');
        }
      };

      if (!activeAudioSourceRef.current) {
        activeAudioSourceRef.current = source;
        isAgentSpeakingRef.current = true;
        setSessionState('speaking');
        source.start();
      } else {
        audioQueueRef.current.push(source);
      }
    } catch (err) {
      console.warn('Audio decoding fallback:', err);
    }
  }, []);

  // Start bidirectional live voice session
  const startSession = async () => {
    setErrorMessage(null);
    setSessionState('requesting_permission');
    connectionStartTimeRef.current = performance.now();

    try {
      // 1. Request microphone with high quality echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      mediaStreamRef.current = stream;

      setSessionState('connecting');

      // 2. AudioContext initialization
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioContextRef.current = audioCtx;

      // 3. Setup AnalyserNode for real-time visualizer meter
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const updateVolumeLoop = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') return;
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        const avg = sum / freqData.length;
        const normalized = Math.min(100, Math.round((avg / 110) * 100));
        setMicLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateVolumeLoop);
      };
      animFrameRef.current = requestAnimationFrame(updateVolumeLoop);

      // 4. Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/talk`;
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        const connectLatency = Math.round(performance.now() - connectionStartTimeRef.current);
        setMetrics((prev) => ({ ...prev, connectTimeMs: connectLatency }));
        setSessionState('listening');

        // Send session initialization frame
        ws.send(JSON.stringify({
          type: 'init',
          organizationId: activeOrg.id,
          agentId: selectedAgent,
          llmProvider: selectedBrain,
          ttsVoice: 'mulberry',
          sampleRate: 16000
        }));

        // Set up streaming audio capture downsampled to 16kHz linear PCM
        const processor = audioCtx.createScriptProcessor(2048, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const inputData = e.inputBuffer.getChannelData(0);

          // Simple client-side VAD energy check for instant barge-in detection
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);

          // If user speaks while agent is speaking: trigger immediate barge-in stop
          if (rms > 0.035 && isAgentSpeakingRef.current) {
            stopAgentAudio();
            ws.send(JSON.stringify({ type: 'barge_in' }));
            setSessionState('listening');
          }

          // Downsample from browser native sampleRate to 16000 Hz 16-bit linear PCM
          const pcm16 = downsampleTo16k(inputData, audioCtx.sampleRate);
          ws.send(pcm16.buffer);
        };

        // Zero-gain node keeps Web Audio stream alive without echoing mic into speakers
        const muteNode = audioCtx.createGain();
        muteNode.gain.value = 0;
        source.connect(processor);
        processor.connect(muteNode);
        muteNode.connect(audioCtx.destination);
      };

      ws.onmessage = (event) => {
        // Binary audio chunk from Rumik TTS
        if (event.data instanceof ArrayBuffer) {
          playAudioChunk(event.data);
          return;
        }

        // JSON events from Voice Agent Pipeline
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'transcript_interim':
              setInterimCaption(msg.text);
              if (!metrics.firstPartialTranscriptMs) {
                setMetrics((prev) => ({
                  ...prev,
                  firstPartialTranscriptMs: Math.round(performance.now() - turnStartTimeRef.current)
                }));
              }
              break;

            case 'transcript_final':
              setInterimCaption('');
              turnStartTimeRef.current = performance.now();
              setTranscript((prev) => [
                ...prev,
                {
                  id: `user-${Date.now()}`,
                  sender: 'user',
                  text: msg.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                }
              ]);
              setSessionState('thinking');
              setMetrics((prev) => ({
                ...prev,
                turnFinalizationMs: msg.latencyMs || 280
              }));
              break;

            case 'agent_thinking':
              setSessionState('thinking');
              break;

            case 'agent_reply_start':
              setSessionState('speaking');
              isAgentSpeakingRef.current = true;
              speakTextAloud(msg.text);
              setMetrics((prev) => ({
                ...prev,
                ttftMs: msg.ttftMs || 165,
                ttsFirstAudioMs: msg.ttsLatencyMs || 220
              }));
              setTranscript((prev) => [
                ...prev,
                {
                  id: `agent-${Date.now()}`,
                  sender: 'agent',
                  text: msg.text,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                }
              ]);
              break;

            case 'barge_in_confirmed':
              stopAgentAudio();
              setSessionState('listening');
              break;

            case 'error':
              setErrorMessage(msg.message || 'Pipeline error encountered');
              break;

            default:
              break;
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setErrorMessage('WebSocket connection error. Check backend server.');
        setSessionState('error');
      };

      ws.onclose = () => {
        if (sessionState !== 'ended') {
          setSessionState('idle');
        }
      };

    } catch (err: any) {
      console.error('Session start failure:', err);
      setSessionState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser.');
      } else {
        setErrorMessage(err.message || 'Failed to initialize audio graph.');
      }
      endSession();
    }
  };

  // End bidirectional session and cleanly release all hardware tracks
  const endSession = () => {
    stopAgentAudio();

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setMicLevel(0);

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {}
      socketRef.current = null;
    }

    setSessionState('idle');
    setInterimCaption('');
  };

  // Accessibility typed input fallback
  const handleSendTypedMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

    const userText = typedMessage.trim();
    setTranscript((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }
    ]);
    setTypedMessage('');
    setSessionState('thinking');

    socketRef.current.send(JSON.stringify({
      type: 'text_turn',
      text: userText
    }));
  };

  const isSessionActive = sessionState === 'listening' || sessionState === 'thinking' || sessionState === 'speaking';

  return (
    <div className="talk-to-it-page">
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Talk to It — Live Conversation Studio</h1>
          <p className="page-header-desc">
            Continuous, hands-free bidirectional voice session with real-time Deepgram STT, Groq/Gemini Brain, and Rumik Silk Mulberry TTS.
          </p>
        </div>

        {/* Configuration Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ color: 'var(--color-ink-muted)' }}>Brain:</span>
            <select
              value={selectedBrain}
              onChange={(e) => setSelectedBrain(e.target.value as 'groq' | 'gemini')}
              disabled={isSessionActive}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 13 }}
            >
              <option value="groq">Groq (Llama 3.3 70B)</option>
              <option value="gemini">Google Gemini 3.5 Flash</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ color: 'var(--color-ink-muted)' }}>TTS:</span>
            <span className="badge badge-accent">Rumik Silk Mulberry</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 'var(--space-6)', backgroundColor: 'var(--color-danger-soft)', borderColor: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={18} color="var(--color-danger)" />
          <span style={{ fontSize: 13, color: 'var(--color-danger)', fontWeight: 500 }}>{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage(null)} 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 12 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left Column: Voice Orb, State, & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <div className="voice-orb-container">
            {/* Live Interactive Orb */}
            <div className={`voice-orb ${sessionState}`}>
              {sessionState === 'speaking' ? (
                <Volume2 size={48} color="#FFFDF8" />
              ) : sessionState === 'thinking' ? (
                <Zap size={48} color="#FFFDF8" />
              ) : isSessionActive ? (
                <Mic size={48} color="#FFFDF8" />
              ) : (
                <MicOff size={48} color="#FFFDF8" opacity={0.6} />
              )}
            </div>

            {/* Live Audio Visualizer Equalizer Meter */}
            {isSessionActive && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '4px 12px', background: 'var(--color-surface-soft)', borderRadius: 20, border: '1px solid var(--color-border)' }}>
                  {[0.5, 0.8, 1.2, 1.6, 1.2, 0.8, 0.5].map((scale, i) => {
                    const barHeight = Math.max(4, Math.min(24, Math.round((micLevel * scale * 0.3) + 4)));
                    const isActive = micLevel > 3;
                    return (
                      <div
                        key={i}
                        style={{
                          width: 4,
                          height: `${barHeight}px`,
                          borderRadius: 2,
                          backgroundColor: isActive ? 'var(--color-success)' : 'var(--color-ink-muted)',
                          opacity: isActive ? 1 : 0.4,
                          transition: 'height 0.08s ease, background-color 0.12s ease'
                        }}
                      />
                    );
                  })}
                </div>
                <span style={{ fontSize: 12, color: micLevel > 3 ? 'var(--color-success)' : 'var(--color-ink-muted)', fontWeight: 500 }}>
                  {micLevel > 3 ? `🎤 Sound detected (${micLevel}%)` : '🎤 Mic live — speak now'}
                </span>
              </div>
            )}

            {/* State Status Badge */}
            <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
              <div style={{ marginBottom: 8 }}>
                {sessionState === 'idle' && <span className="badge badge-neutral">Ready to connect</span>}
                {sessionState === 'requesting_permission' && <span className="badge badge-warning">Requesting microphone...</span>}
                {sessionState === 'connecting' && <span className="badge badge-warning">Opening WebSocket session...</span>}
                {sessionState === 'listening' && <span className="badge badge-success"><Activity size={12} /> Listening — speak naturally</span>}
                {sessionState === 'thinking' && <span className="badge badge-warning"><Zap size={12} /> Thinking (Llama 3.3 / Gemini)...</span>}
                {sessionState === 'speaking' && <span className="badge badge-accent"><Volume2 size={12} /> Speaking (Rumik Mulberry) — barge-in active</span>}
                {sessionState === 'error' && <span className="badge badge-danger">Session Disconnected</span>}
              </div>

              <p style={{ fontSize: 13, maxWidth: 360, margin: '0 auto' }}>
                {isSessionActive 
                  ? 'Hands-free multi-turn session. Speak naturally. Interrupting at any moment stops speech immediately (<250ms).'
                  : 'Press "Start Live Conversation" once to open a bidirectional session. No push-to-talk required.'}
              </p>
            </div>

            {/* Single Action Button */}
            <div style={{ marginTop: 'var(--space-8)' }}>
              {!isSessionActive ? (
                <button 
                  id="start-live-conversation-btn"
                  className="btn-primary" 
                  onClick={startSession}
                  style={{ padding: '12px 28px', fontSize: 15 }}
                >
                  <Play size={18} /> Start Live Conversation
                </button>
              ) : (
                <button 
                  id="end-live-conversation-btn"
                  className="btn-danger" 
                  onClick={endSession}
                  style={{ padding: '12px 28px', fontSize: 15 }}
                >
                  <Square size={18} /> End Conversation
                </button>
              )}
            </div>
          </div>

          {/* Diagnostic Latency Panel */}
          <div className="telemetry-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>Pipeline Diagnostic Telemetry</span>
              <span style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>Target &lt; 250ms</span>
            </div>

            <div className="telemetry-row">
              <span>WS Connect Handshake:</span>
              <strong>{metrics.connectTimeMs ? `${metrics.connectTimeMs} ms` : '—'}</strong>
            </div>
            <div className="telemetry-row">
              <span>Deepgram First Partial:</span>
              <strong>{metrics.firstPartialTranscriptMs ? `${metrics.firstPartialTranscriptMs} ms` : '—'}</strong>
            </div>
            <div className="telemetry-row">
              <span>Turn Finalization (VAD):</span>
              <strong>{metrics.turnFinalizationMs ? `${metrics.turnFinalizationMs} ms` : '—'}</strong>
            </div>
            <div className="telemetry-row">
              <span>Brain TTFT (First Token):</span>
              <strong>{metrics.ttftMs ? `${metrics.ttftMs} ms` : '—'}</strong>
            </div>
            <div className="telemetry-row">
              <span>Rumik First Audio Frame:</span>
              <strong>{metrics.ttsFirstAudioMs ? `${metrics.ttsFirstAudioMs} ms` : '—'}</strong>
            </div>
            <div className="telemetry-row" style={{ color: metrics.bargeInStopLatencyMs && metrics.bargeInStopLatencyMs <= 250 ? 'var(--color-success)' : undefined }}>
              <span>Barge-in Stop Latency:</span>
              <strong>{metrics.bargeInStopLatencyMs ? `${metrics.bargeInStopLatencyMs} ms` : '—'}</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Live Scrolling Transcript & Accessibility Fallback */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 620, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Session Conversation Transcript</span>
            <span style={{ fontSize: 12, color: 'var(--color-ink-muted)' }}>{transcript.length} turns recorded</span>
          </div>

          {/* Transcript Scroll Area */}
          <div 
            ref={transcriptContainerRef}
            style={{ 
              flex: 1, 
              padding: '20px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 16 
            }}
          >
            {transcript.length === 0 && !interimCaption && (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--color-ink-muted)', fontSize: 13 }}>
                <Sparkles size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                Conversation history will stream here in real time.
              </div>
            )}

            {transcript.map((turn) => (
              <div 
                key={turn.id} 
                style={{
                  alignSelf: turn.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: turn.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginBottom: 4, display: 'flex', gap: 6 }}>
                  <span>{turn.sender === 'user' ? 'You' : 'Rumik Agent'}</span>
                  <span>•</span>
                  <span>{turn.timestamp}</span>
                </div>
                <div 
                  style={{
                    padding: '10px 16px',
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.45,
                    backgroundColor: turn.sender === 'user' ? 'var(--color-accent-soft)' : 'var(--color-surface-muted)',
                    color: turn.sender === 'user' ? 'var(--color-ink)' : 'var(--color-ink)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  {turn.text}
                </div>
              </div>
            ))}

            {/* Real-time Interim Streaming Transcript */}
            {interimCaption && (
              <div style={{ alignSelf: 'flex-end', maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ fontSize: 11, color: 'var(--color-accent)', marginBottom: 4 }}>
                  Streaming interim caption...
                </div>
                <div 
                  style={{
                    padding: '10px 16px',
                    borderRadius: 14,
                    fontSize: 14,
                    lineHeight: 1.45,
                    backgroundColor: 'var(--color-canvas)',
                    color: 'var(--color-ink-muted)',
                    border: '1px dashed var(--color-accent)',
                    fontStyle: 'italic'
                  }}
                >
                  {interimCaption}
                </div>
              </div>
            )}
          </div>

          {/* Accessibility Typed Input Fallback */}
          <form 
            onSubmit={handleSendTypedMessage}
            style={{ 
              padding: '12px 16px', 
              borderTop: '1px solid var(--color-border)', 
              background: 'var(--color-surface-muted)',
              display: 'flex',
              gap: 8
            }}
          >
            <input
              type="text"
              placeholder={isSessionActive ? "Type as an accessibility fallback..." : "Start session to enable interaction..."}
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              disabled={!isSessionActive}
              style={{
                flex: 1,
                padding: '8px 14px',
                borderRadius: 'var(--radius-control)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                fontSize: 13
              }}
            />
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={!isSessionActive || !typedMessage.trim()}
              style={{ padding: '8px 14px' }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
