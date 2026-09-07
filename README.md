# Rumik ₹1 AI Voice Agent Stack

A production-grade, self-hosted voice agent platform engineered for extreme low latency, conversational naturalness, and verifiable cost efficiency.

```
AI runtime: from ~₹1 per minute.
Formula: Deepgram Nova-3 STT + Groq Llama 3.3 70B (or Gemini 3.5 Flash Lite) + Rumik Silk Mulberry TTS.
Telephony (VoBiz/VoiceLink PSTN/SIP) is carrier-dependent and billed separately.
```

---

## 1. System Architecture

The stack couples a low-latency streaming pipeline with self-hosted orchestration and a premium control dashboard:

1. **Dograh Workflow Builder & Call Orchestrator**: Self-hosted visual voice graph engine managing call flows, webhooks, SIP trunks, state transitions, and audio pipelines.
2. **Telephony Layer**:
   - **VoBiz**: Primary Indian PSTN telephony provider, dedicated application routing with POST webhook on `/api/v1/telephony/inbound/run`.
   - **VoiceLink**: Optional secondary carrier utilizing G.711 A-law at 8 kHz audio streaming over WebSocket.
3. **AI Pipeline Core (Target ~ ₹1/minute)**:
   - **STT**: Deepgram Nova-3 Multilingual (real-time streaming captions, ultra-low WER, Hindi/Indian English support).
   - **LLM Brain**: Groq Llama 3.3 70B Versatile (TTFT ~120-200ms) with Google Gemini 3.5 Flash Lite as a fully supported alternative.
   - **TTS**: Rumik Silk Mulberry (expressive, natural Indian-English conversational synthesis, streaming audio).
4. **Replora Voice Studio UI**:
   - Built on a **Warm Cream Design System** (`#FBF7EF` palette, elegant serif typography, 8px grid, zero neon/dark artifacts).
   - **Continuous "Talk to It" Voice Studio**: Real-time bidirectional WebSocket session, interim transcription, automated turn finalization, and sub-250ms barge-in interruption handling.
   - **Recharts Analytics Engine**: Call volume area charts, outcome bars, latency/cost line trends, and conversion funnels.
   - **Enterprise Multi-Tenancy**: Organization and sub-account hierarchy with strict RBAC (Owner, Admin, Operator, Analyst, Viewer), encrypted credentials, audit logging, and tenant-scoped resources.

---

## 2. Directory Structure

```
.
├── .env.example                     # Environment template
├── .gitignore                       # Strict secrecy exclusions
├── docker-compose.yml               # Multi-container orchestration
├── README.md                        # Platform guide and quickstart
├── ONE-SHOT-PROMPT.md               # Deployment instructions & constraints
├── docs/
│   ├── PRICING.md                   # Transparent ₹1/min cost breakdown
│   ├── RUMIK-OVERLAY.md             # Pipecat-rumik overlay integration guide
│   └── TROUBLESHOOTING.md           # Operational failure recovery guide
├── deploy/
│   ├── 01-deploy-dograh.sh          # Dograh orchestrator deployment
│   ├── 02-build-rumik-overlay.sh    # Pipecat-rumik overlay builder (--no-deps)
│   ├── 03-configure.sh              # Telephony & AI provider configuration
│   ├── 04-check-interrupts.sh       # Barge-in and audio latency validator
│   └── 06-deploy-dashboard.sh       # Voice Studio UI container launcher
└── dashboard/
    ├── DESIGN.md                    # Visual token contract & component specs
    ├── server.js                    # Node 20 backend (API + WebSockets + Multi-tenancy)
    ├── package.json                 # React + Vite + Recharts + Lucide dependencies
    └── src/                         # Rebuilt Cream Design UI components
```

---

## 3. Quickstart (LOCAL Mode)

1. Copy `.env.example` to `.env` and supply your credentials:
   ```bash
   cp .env.example .env
   ```
2. Start the Dograh orchestrator and dependencies:
   ```bash
   bash deploy/01-deploy-dograh.sh
   ```
3. Apply the Rumik overlay into Dograh's pipeline:
   ```bash
   bash deploy/02-build-rumik-overlay.sh
   ```
4. Start the Replora Voice Studio UI:
   ```bash
   bash deploy/06-deploy-dashboard.sh
   # Or natively:
   cd dashboard && npm install && npm start
   ```
5. Access the services:
   - **Studio UI**: `http://localhost:8787`
   - **Studio Console**: `http://localhost:8787/app.html`
   - **Dograh Builder**: `http://localhost:3000`

---

## 4. Operating Rules & Safety

1. **No Unconfirmed Outbound Calls**: Never dial a phone number or trigger a campaign without explicit confirmation of target numbers and call scope.
2. **Strict Consent & Compliance**: Adhere to DND / telemarketing guidelines and local calling hour windows (09:00 - 19:00).
3. **Secret Isolation**: Never commit `.env` or credentials. All provider secrets are masked in the UI and encrypted at rest.
