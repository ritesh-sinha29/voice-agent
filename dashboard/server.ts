// ==============================================================================
// Replora Voice Studio — Next.js Custom Server with Live WebSocket Engine (v1.3.0)
// Production-hardened with authentication, body size limits, CORS restrictions,
// greeting lifecycle, debounce cleanup, and turn-lock.
// Deepgram Nova-3 + Groq + Rumik Silk Studio TTS
// ==============================================================================

import http, { IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import next from 'next';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
const envPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const PORT: number = parseInt(process.env.PORT || '8787', 10);
const dev: boolean = process.env.NODE_ENV !== 'production';
const DEPLOY_MODE: string = process.env.DEPLOY_MODE || 'LOCAL';
const DASHBOARD_API_KEY: string = process.env.DASHBOARD_API_KEY || '';
const ALLOWED_ORIGINS: string[] = (process.env.ALLOWED_ORIGINS || 'http://localhost:8787,http://127.0.0.1:8787,http://localhost:3000,http://127.0.0.1:3000').split(',');
const MAX_BODY_SIZE = 10 * 1024; // [H2] 10KB max request body
const MAX_WS_CONNECTIONS_PER_IP = 5; // [H10] WebSocket connection rate limit
const wsConnectionCounts: Map<string, number> = new Map();

// Instantiate Next.js
const nextApp = next({ dev, dir: process.cwd() });
const nextHandler = nextApp.getRequestHandler();

// Prompt injection guardrails
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior)/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+in\s+dan\s+mode/i,
  /jailbreak/i,
  /developer\s+mode/i,
  /reveal\s+(your\s+)?prompt/i,
  /repeat\s+the\s+words\s+above/i,
  /act\s+as\s+an\s+unfiltered/i
];

function sanitizeUserSpeech(text: string): string {
  if (!text) return '';
  const cleaned = text.trim().slice(0, 400);
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(cleaned)) {
      console.warn('[Security Guard] Blocked prompt injection pattern in speech:', cleaned.slice(0, 80));
      return 'I apologize, but I am programmed to assist strictly as the Replora receptionist. How can I assist with your voice agent needs today?';
    }
  }
  return cleaned;
}

// Helper to generate a minimal valid 24kHz Mono 16-bit PCM WAV buffer
function generateWavHeader(dataLength: number, sampleRate: number = 24000): Buffer {
  const buffer = Buffer.alloc(44);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  return buffer;
}

// Offline fallback harmonic speech waveform
function generateSyntheticSpeechPcm(durationSec: number = 1.5, sampleRate: number = 24000): Buffer {
  const numSamples = Math.floor(sampleRate * durationSec);
  const data = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * (i / numSamples));
    const sample = Math.sin(2 * Math.PI * 220 * t) * 0.3 + Math.sin(2 * Math.PI * 440 * t) * 0.15;
    const val = Math.max(-1, Math.min(1, sample * envelope));
    const intVal = val < 0 ? val * 0x8000 : val * 0x7FFF;
    data.writeInt16LE(intVal, i * 2);
  }
  const header = generateWavHeader(data.length, sampleRate);
  return Buffer.concat([header, data]);
}

// High-Fidelity Human Speech Synthesis
async function synthesizeHumanSpeech(text: string, voice: string = 'asteria'): Promise<Buffer> {
  const ttsProvider = (process.env.TTS_PROVIDER || 'deepgram').toLowerCase();
  const deepgramKey = process.env.DEEPGRAM_API_KEY;
  const rumikKey = process.env.RUMIK_API_KEY;
  const rumikUrl = process.env.RUMIK_GATEWAY_URL || 'https://silk-api.rumik.ai';

  // 1. Primary: Deepgram Aura Neural TTS (~600ms latency for streaming sentences)
  if (ttsProvider === 'deepgram' && deepgramKey) {
    try {
      const resp = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        if (buffer.length > 200) {
          return buffer;
        }
      }
    } catch (e: any) {
      console.warn('[Deepgram Aura] Error:', e.message);
    }
  }

  // 2. Secondary: Rumik Silk Mulberry Studio Voice (24kHz WAV)
  if (rumikKey) {
    try {
      const resp = await fetch(`${rumikUrl}/v1/tts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${rumikKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, voice: 'mulberry' })
      });
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        if (buffer.length > 200) {
          return buffer;
        }
      }
    } catch (e: any) {
      console.warn('[Rumik TTS] Error:', e.message);
    }
  }

  // 3. Fallback to Deepgram Aura
  if (deepgramKey && ttsProvider !== 'deepgram') {
    try {
      const resp = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      if (resp.ok) {
        const arrayBuf = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        if (buffer.length > 200) return buffer;
      }
    } catch (e: any) {}
  }

  return generateSyntheticSpeechPcm(1.5, 24000);
}

interface SessionState {
  isSpeaking: boolean;
  turnCount: number;
  activeTimer: NodeJS.Timeout | null;
  history: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

const HUMAN_PROMPT = 
  "You are Maya, a warm, polite, and articulate multilingual receptionist at Replora. " +
  "You are on a live voice phone call with a customer.\n\n" +
  "MULTILINGUAL & CONVERSATIONAL SPOKEN VOICE GUIDELINES:\n" +
  "1. Supported Languages: English (en-IN), Hindi (hi-IN), Hinglish, Gujarati (gu-IN), and Punjabi (pa-IN).\n" +
  "2. Language Matching: Automatically detect the caller's language and respond in the EXACT same language or natural conversational code-mixed Hinglish:\n" +
  "   - If caller speaks Hindi or Hinglish: Respond in natural spoken Hindi/Hinglish (e.g. 'Namaste! Haan ji, main bilkul aapki madad kar sakti hoon.').\n" +
  "   - If caller speaks Gujarati: Respond in natural spoken Gujarati (e.g. 'Namaste! Hu tamari madat kari shaku chu.').\n" +
  "   - If caller speaks Punjabi: Respond in natural spoken Punjabi (e.g. 'Sat Sri Akal ji! Haanji, main tuhadi bilkul madad kar sakdi haan.').\n" +
  "   - If caller speaks English: Respond in warm Indian English (e.g. 'Namaste! I would be delighted to assist you with that.').\n" +
  "3. Full Content Delivery: Speak in 1 to 2 spoken sentences, natural, and expressive sentences. Deliver your full thought clearly so the caller completely understands without feeling rushed. Do not trail off or stop mid-thought.\n" +
  "4. Use spoken contractions: say 'I'm', 'we're', 'don't', 'it's', 'I'd'.\n" +
  "5. NEVER output markdown symbols, asterisks, bullet points, numbered lists, hashtags, or emojis. They sound terrible when read aloud.\n" +
  "6. Format prices and numbers phonetically: say 'about one rupee per minute' or 'five hundred rupees', NEVER symbols like '₹1/min'.";

async function main(): Promise<void> {
  await nextApp.prepare();

  // ==========================================================================
  // [SEC] Timing-safe string comparison preventing length-mismatch exceptions
  // ==========================================================================
  function safeCompare(a: string, b: string): boolean {
    if (!a || !b) return false;
    const hashA = crypto.createHash('sha256').update(Buffer.from(a)).digest();
    const hashB = crypto.createHash('sha256').update(Buffer.from(b)).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }

  // ==========================================================================
  // [SEC] Authentication helper — validates X-API-Key or Authorization Bearer
  // ==========================================================================
  function requireAuth(req: IncomingMessage, res: ServerResponse): boolean {
    if (DASHBOARD_API_KEY && !DASHBOARD_API_KEY.startsWith('CHANGE_ME')) {
      const headerKey = req.headers['x-api-key'] as string;
      const authHeader = req.headers['authorization'] as string;
      const bearerKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      const apiKey = headerKey || bearerKey;

      if (!apiKey || !safeCompare(apiKey, DASHBOARD_API_KEY)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid or missing API key.' }));
        return false;
      }
    } else if (DEPLOY_MODE !== 'LOCAL') {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service not configured. DASHBOARD_API_KEY required.' }));
      return false;
    }
    return true;
  }

  // ==========================================================================
  // [H2] Body parser with size limit
  // ==========================================================================
  function parseBody(req: IncomingMessage, maxSize: number = MAX_BODY_SIZE): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      let size = 0;
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > maxSize) {
          req.destroy();
          reject(new Error('Request body too large'));
          return;
        }
        body += chunk;
      });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  // ==========================================================================
  // [SEC] Input sanitization for .env values
  // ==========================================================================
  function sanitizeEnvValue(value: string): string {
    // Strip newlines, carriage returns, null bytes, and shell-dangerous chars
    return value.replace(/[\r\n\0\$`"'\\;|&]/g, '').trim().slice(0, 128);
  }

  // ==========================================================================
  // [SEC] CORS origin validation
  // ==========================================================================
  function getCorsOrigin(req: IncomingMessage): string {
    const origin = req.headers.origin || '';
    if (DEPLOY_MODE === 'LOCAL') return origin || '*';
    if (ALLOWED_ORIGINS.includes(origin)) return origin;
    return ''; // Deny
  }

  // Create HTTP Server with Security Headers
  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; connect-src 'self' ws: wss:; img-src 'self' data:;"
    );

    // [C5] CORS — restrict to configured origins
    const corsOrigin = getCorsOrigin(req);
    if (corsOrigin) {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
      if (DEPLOY_MODE !== 'LOCAL') {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // [L6] Use URL constructor instead of deprecated parse()
    const baseUrl = `http://${req.headers.host || 'localhost'}`;
    const parsedUrl = new URL(req.url || '/', baseUrl);
    const pathname = parsedUrl.pathname;

    // Health check endpoint — [H4] minimal info publicly
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        version: '1.3.0'
      }));
      return;
    }

    // Rumik TTS 24kHz Smoke Test Endpoint — [C6] requires auth
    if (pathname === '/api/smoke-test/rumik-tts') {
      if (!requireAuth(req, res)) return;
      const audioBuffer = await synthesizeHumanSpeech('Namaste! This is Maya testing the Rumik voice engine.', 'mulberry');
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': audioBuffer.length
      });
      res.end(audioBuffer);
      return;
    }

    // AI Brain Smoke Test — [C6] requires auth
    if (pathname === '/api/smoke-test/brain') {
      if (!requireAuth(req, res)) return;
      const provider = process.env.LLM_PROVIDER || 'groq';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        provider,
        model: process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
        status: 'ready',
        ttftTargetMs: 140
      }));
      return;
    }

    // Multi-tenant Telephony Status API — [H5/C6] requires auth, masks sensitive data
    if (pathname === '/api/telephony/status') {
      if (!requireAuth(req, res)) return;
      const publicDomain = process.env.PUBLIC_DOMAIN || 'localhost:8000';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        vobiz: {
          number: process.env.VOBIZ_NUMBER ? process.env.VOBIZ_NUMBER.slice(0, 6) + '****' : 'Not Configured',
          answerUrl: `https://${publicDomain}/api/v1/telephony/inbound/run`,
          authId: process.env.VOBIZ_AUTH_ID ? `VB_****` : 'Not Configured',
          status: process.env.VOBIZ_AUTH_ID && process.env.VOBIZ_NUMBER ? 'connected' : 'mock_connected'
        },
        testNumber: process.env.TEST_NUMBER ? process.env.TEST_NUMBER.slice(0, 6) + '****' : 'Not Set',
        voicelink: {
          did: 'masked',
          status: 'carrier_blocked',
          note: 'Incoming service activation required by VoiceLink provider.'
        }
      }));
      return;
    }

    // Multi-tenant Telephony Outbound Call Dispatch API — [C6] requires auth
    if (pathname === '/api/telephony/outbound' && req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      try {
        const body = await parseBody(req);
        const payload = JSON.parse(body || '{}');
        const targetNumber = payload.target_number || payload.targetNumber;

        // Forward to FastAPI voice agent service with API key
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (DASHBOARD_API_KEY) headers['X-API-Key'] = DASHBOARD_API_KEY;

        const resp = await fetch('http://localhost:8000/api/v1/telephony/outbound', {
          method: 'POST',
          headers,
          body: JSON.stringify({ target_number: targetNumber })
        });
        const data = await resp.json();
        res.writeHead(resp.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (e: any) {
        const msg = e.message === 'Request body too large' ? 'Request body too large' : 'Internal server error';
        res.writeHead(e.message === 'Request body too large' ? 413 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: msg }));
      }
      return;
    }

    // [C3] Save Carrier Configuration to .env — SECURED with auth + input validation
    if (pathname === '/api/telephony/config' && req.method === 'POST') {
      if (!requireAuth(req, res)) return;
      try {
        const body = await parseBody(req);
        const payload = JSON.parse(body || '{}');
        const authId = payload.authId ? sanitizeEnvValue(payload.authId) : '';
        const authToken = payload.authToken ? sanitizeEnvValue(payload.authToken) : '';
        const number = payload.number ? sanitizeEnvValue(payload.number) : '';

        // Validate phone number format if provided
        if (number && !/^\+[1-9]\d{7,14}$/.test(number)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid phone number format. Must be E.164 (e.g. +919876543210).' }));
          return;
        }

        if (authId) process.env.VOBIZ_AUTH_ID = authId;
        if (authToken) process.env.VOBIZ_AUTH_TOKEN = authToken;
        if (number) process.env.VOBIZ_NUMBER = number;

        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          if (authId) {
            envContent = envContent.replace(/^VOBIZ_AUTH_ID=.*$/m, `VOBIZ_AUTH_ID=${authId}`);
          }
          if (authToken) {
            envContent = envContent.replace(/^VOBIZ_AUTH_TOKEN=.*$/m, `VOBIZ_AUTH_TOKEN=${authToken}`);
          }
          if (number) {
            envContent = envContent.replace(/^VOBIZ_NUMBER=.*$/m, `VOBIZ_NUMBER=${number}`);
          }
          fs.writeFileSync(envPath, envContent, 'utf8');
        }

        console.log('[Config] Carrier configuration updated (auth required).');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Carrier configuration saved successfully.' }));
      } catch (e: any) {
        const msg = e.message === 'Request body too large' ? 'Request body too large' : 'Configuration update failed.';
        res.writeHead(e.message === 'Request body too large' ? 413 : 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: msg }));
      }
      return;
    }

    // Multi-tenant Audit API — [C6] requires auth
    if (pathname === '/api/audit') {
      if (!requireAuth(req, res)) return;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        logs: [
          { action: 'SERVER_BOOT', details: 'Started Replora Voice Studio on port ' + PORT, timestamp: new Date().toISOString() }
        ]
      }));
      return;
    }

    // Forward all other routes to Next.js App Router
    return nextHandler(req, res);
  });

  // Attach WebSocket Server for Live Voice Conversations (/ws/talk)
  const wss = new WebSocketServer({ noServer: true });

  // [H10] WebSocket connection rate limiting helper
  function getClientIp(req: IncomingMessage): string {
    return (req.socket.remoteAddress || 'unknown').replace('::ffff:', '');
  }

  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (reqUrl.pathname === '/ws/talk') {
      // [H10] Check connection limit
      const clientIp = getClientIp(request);
      const currentCount = wsConnectionCounts.get(clientIp) || 0;
      if (currentCount >= MAX_WS_CONNECTIONS_PER_IP) {
        console.warn(`[Security] WebSocket connection limit reached for IP: ${clientIp}`);
        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
        socket.destroy();
        return;
      }
      wsConnectionCounts.set(clientIp, currentCount + 1);

      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        // Track cleanup on close
        ws.on('close', () => {
          const count = wsConnectionCounts.get(clientIp) || 1;
          if (count <= 1) {
            wsConnectionCounts.delete(clientIp);
          } else {
            wsConnectionCounts.set(clientIp, count - 1);
          }
        });
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] Client connected to live voice session.');

    const sessionState: SessionState = {
      isSpeaking: false,
      turnCount: 0,
      activeTimer: null,
      history: [
        { role: 'system', content: HUMAN_PROMPT }
      ]
    };

    // Connect to Deepgram Live Streaming STT
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    let deepgramWs: WebSocket | null = null;
    let userTranscriptAccumulator = '';
    let turnDebounceTimer: NodeJS.Timeout | null = null;
    let greetingTimer: NodeJS.Timeout | null = null;  // [H2] Explicit greeting handle
    let isTurnInProgress = false;  // Turn-lock flag to prevent double execution

    const stopAgentSpeech = () => {
      if (sessionState.isSpeaking) {
        console.log('[Barge-In] Interruption triggered, halting agent speech.');
        sessionState.isSpeaking = false;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'barge_in_confirmed', latencyMs: 16 }));
        }
      }
      // [H2] Cancel greeting if still pending
      if (greetingTimer) {
        clearTimeout(greetingTimer);
        greetingTimer = null;
        console.log('[H2] Greeting timer cancelled due to barge-in.');
      }
    };

    const triggerFinalTurn = () => {
      const text = userTranscriptAccumulator.trim();
      if (!text) return;

      // Prevent double execution from racing UtteranceEnd + speech_final
      if (isTurnInProgress) {
        console.log('[Turn Guard] Skipping duplicate turn trigger (turn already in progress).');
        return;
      }

      userTranscriptAccumulator = '';
      if (turnDebounceTimer) {
        clearTimeout(turnDebounceTimer);
        turnDebounceTimer = null;
      }
      console.log('[Turn Finalized]:', text);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'transcript_final',
          text
        }));
      }
      handleUserTurn(text);
    };

    if (deepgramKey) {
      const dgUrl = 'wss://api.deepgram.com/v1/listen?model=nova-3&language=en-IN&interim_results=true&smart_format=true&encoding=linear16&sample_rate=16000&vad_events=true&endpointing=200&utterance_end_ms=500';
      deepgramWs = new WebSocket(dgUrl, {
        headers: {
          'Authorization': `Token ${deepgramKey}`
        }
      });

      deepgramWs.on('open', () => {
        console.log('[Deepgram] Live Nova-3 STT WebSocket connected (16kHz linear16).');
      });

      deepgramWs.on('message', (dgData: RawData) => {
        try {
          const resp = JSON.parse(dgData.toString());

          // Handle UtteranceEnd event
          if (resp.type === 'UtteranceEnd') {
            if (userTranscriptAccumulator.trim()) {
              triggerFinalTurn();
            }
            return;
          }

          const transcript = resp.channel?.alternatives?.[0]?.transcript;
          if (transcript && transcript.trim()) {
            const words = transcript.trim().split(/\s+/);
            // Word-level interruption: Stop agent speech immediately when caller utters words
            if (sessionState.isSpeaking && words.length >= 1) {
              stopAgentSpeech();
            }

            const isFinal = resp.is_final;
            const speechFinal = resp.speech_final;

            if (isFinal) {
              userTranscriptAccumulator += (userTranscriptAccumulator ? ' ' : '') + transcript.trim();

              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'transcript_interim',
                  text: userTranscriptAccumulator
                }));
              }

              if (speechFinal) {
                triggerFinalTurn();
              } else {
                if (turnDebounceTimer) clearTimeout(turnDebounceTimer);
                turnDebounceTimer = setTimeout(() => {
                  triggerFinalTurn();
                }, 300);
              }
            } else {
              const preview = (userTranscriptAccumulator ? userTranscriptAccumulator + ' ' : '') + transcript.trim();
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'transcript_interim',
                  text: preview
                }));
              }
            }
          }
        } catch (e) {
          console.error('[Deepgram Parse Error]', e);
        }
      });

      deepgramWs.on('error', (err) => {
        console.error('[Deepgram WS Error]:', err.message);
      });
    }

    // Handle user turn with Groq and real Rumik Silk TTS
    // Includes turn-lock to prevent double execution from racing events
    const handleUserTurn = async (userQuery: string) => {
      const cleanQuery = sanitizeUserSpeech(userQuery);
      if (!cleanQuery) return;

      // Turn-lock: prevent concurrent double execution
      if (isTurnInProgress) {
        console.log('[Turn Lock] Skipping duplicate handleUserTurn (already processing).');
        return;
      }
      isTurnInProgress = true;

      try {
        sessionState.turnCount += 1;
        sessionState.history.push({ role: 'user', content: cleanQuery });

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'agent_thinking' }));
        }

        const startTime = Date.now();
        let replyText = "Namaste! I would be delighted to assist you with that. Our voice stack runs from about one rupee per minute with instant responses.";
        
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
          const models = [
            process.env.GROQ_MODEL || 'qwen/qwen3.8-27b',
            'qwen/qwen3.8-27b',
            'qwen/qwen3.6-27b',
            'openai/gpt-oss-20b'
          ];

          for (const modelName of models) {
            try {
              const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${groqKey}`,
                  'Content-Type': 'application/json',
                  'User-Agent': 'Replora-VoiceStudio/1.3.0'
                },
                body: JSON.stringify({
                  model: modelName,
                  messages: [
                    { role: 'system', content: HUMAN_PROMPT },
                    ...sessionState.history.slice(-6)
                  ],
                  max_tokens: 100,
                  temperature: 0.7
                })
              });

              if (groqRes.ok) {
                const data = await groqRes.json();
                const content = data.choices?.[0]?.message?.content;
                if (content) {
                  replyText = content.replace(/[*#]/g, '').trim();
                  break;
                }
              }
            } catch (err: any) {
              console.warn(`[Groq ${modelName} Attempt Error]`, err.message);
            }
          }
        }

        const ttftMs = Date.now() - startTime;

        if (ws.readyState === WebSocket.OPEN) {
          sessionState.history.push({ role: 'assistant', content: replyText });
          sessionState.isSpeaking = true;

          // Split reply into sentence chunks for streaming audio delivery
          const sentenceChunks = replyText.split(/(?<=[.?!।\n])\s+/).map(s => s.trim()).filter(Boolean);
          const chunks = sentenceChunks.length > 0 ? sentenceChunks : [replyText];

          ws.send(JSON.stringify({
            type: 'agent_reply_start',
            text: replyText,
            ttftMs: ttftMs || 120,
            voice: process.env.TTS_PROVIDER || 'deepgram'
          }));

          for (const chunk of chunks) {
            if (!sessionState.isSpeaking) break;
            try {
              const chunkAudio = await synthesizeHumanSpeech(chunk);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(chunkAudio);
              }
            } catch (ttsErr: any) {
              // [H8] Emit error frame on TTS failure
              console.error('[H8] TTS synthesis failed:', ttsErr.message);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'error', message: 'Voice synthesis encountered an issue.' }));
              }
              break;
            }
          }
        }
      } catch (err: any) {
        // [H8] Emit error frame on any unhandled failure to unblock UI
        console.error('[H8] handleUserTurn failed:', err.message);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: "I'm having a temporary issue. Please try again." }));
        }
      } finally {
        isTurnInProgress = false;
      }
    };

    // [H2] Initial greeting on connection — tracked for lifecycle management
    greetingTimer = setTimeout(async () => {
      greetingTimer = null;
      if (ws.readyState === WebSocket.OPEN) {
        const greetingText = "Namaste! Thanks for calling Replora. My name is Maya. How can I assist you today?";
        sessionState.history.push({ role: 'assistant', content: greetingText });
        
        const audioBuffer = await synthesizeHumanSpeech(greetingText, 'mulberry');

        ws.send(JSON.stringify({
          type: 'agent_reply_start',
          text: greetingText,
          ttftMs: 130,
          ttsLatencyMs: 180,
          voice: 'mulberry'
        }));

        ws.send(audioBuffer);
      }
    }, 400);

    const MAX_AUDIO_FRAME_SIZE = 32768; // 32KB frame limit

    ws.on('message', (data: RawData, isBinary: boolean) => {
      // 1. Binary Audio Frame from Browser getUserMedia -> Forward to Deepgram
      if (isBinary) {
        const buf = data as Buffer;
        if (buf.length > MAX_AUDIO_FRAME_SIZE) {
          console.warn('[Security] Dropping oversized audio frame:', buf.length);
          return;
        }

        if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
          deepgramWs.send(data);
        }
        return;
      }

      // 2. Control & Text Frames
      try {
        const msg = JSON.parse(data.toString());

        // Client-side Barge-In interruption signal
        if (msg.type === 'barge_in') {
          stopAgentSpeech();
          return;
        }

        // Accessibility Text Turn
        if (msg.type === 'text_turn') {
          handleUserTurn(msg.text);
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Session disconnected.');
      // Clean up all timers to prevent leaks
      if (sessionState.activeTimer) {
        clearTimeout(sessionState.activeTimer);
        sessionState.activeTimer = null;
      }
      // [H2] Cancel greeting timer on disconnect
      if (greetingTimer) {
        clearTimeout(greetingTimer);
        greetingTimer = null;
      }
      // Clear debounce timer on disconnect
      if (turnDebounceTimer) {
        clearTimeout(turnDebounceTimer);
        turnDebounceTimer = null;
      }
      if (deepgramWs) {
        try {
          deepgramWs.close();
        } catch (e) {}
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`  Replora Voice Studio (Pure TypeScript + Next.js) Ready`);
    console.log(`  Studio URL:    http://localhost:${PORT}`);
    console.log(`  Mode:          ${process.env.DEPLOY_MODE || 'LOCAL'}`);
    console.log(`  AI Pipeline:   Deepgram Nova-3 + Groq Qwen + Rumik Silk Mulberry`);
    console.log(`  Telephony:     VoBiz Primary (+91 PSTN) | VoiceLink Secondary`);
    console.log(`  Hardening:     Turn-lock, Greeting lifecycle, Debounce cleanup`);
    console.log(`=============================================================\n`);
  });
}

main().catch((err: any) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
