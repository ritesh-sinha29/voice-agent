# ONE-SHOT-PROMPT Reference & Guidelines

This document outlines the strict operational constraints, principles, and deployment phases for the **Rumik ₹1 AI Voice Agent Stack**.

---

## Core Principles

1. **Honest Runtime Cost Statement**:
   - The public claim is strictly: *"AI runtime from about ₹1 per minute."*
   - Telephony is an external carrier product and must never be added to this total.
   - Do not aggregate VoBiz, SIP trunks, DID rentals, or server infrastructure into the ₹1 AI figure.

2. **Zero Involuntary Calls**:
   - Outbound phone calls and bulk campaigns are locked behind explicit operator confirmation.
   - All campaigns must start with a conservative canary of `max_concurrency=1`.
   - Local DND regulations and legitimate consent must be checked before calling lists are processed.

3. **Production Voice Pipeline over Native Realtime**:
   - PSTN calls must follow the low-latency modular pipeline: **Deepgram Nova-3 → Groq Llama 3.3 (or Gemini) → Rumik Silk Mulberry**.
   - Do not use monolithic native-audio models for PSTN where deterministic barge-in and precise cost tracking are required.

4. **Cream Design System & No Dark/Neon Artifacts**:
   - The UI adheres strictly to the warm cream design system (`#FBF7EF` canvas, `#FFFDF8` elevated surface, refined serif headings).
   - Glassmorphism fog, neon glows, and dark backgrounds are prohibited.

---

## Phase Execution Checklist

- [x] **Phase 1: Preflight**: Git, Docker, Python, curl verification; gitignored `.env`.
- [x] **Phase 2A: Local Mode**: Bundled Node 20 Studio UI container + Dograh orchestrator.
- [x] **Phase 2B: Cloud Mode**: Public Ubuntu VM, reverse proxy, open ports, and health checks.
- [x] **Phase 2C: Studio Product Rebuild**:
  - `DESIGN.md` contract.
  - Continuous bidirectional WebSocket "Talk to it" with real barge-in (<250ms).
  - Recharts analytics dashboard (Area, Bar, Line, Funnel) with truthful empty states.
  - Backend-enforced multi-tenancy (workspaces, sub-accounts, roles, audit logs).
- [x] **Phase 3: Rumik Agent**: `Rumik ₹1 Demo Agent` workflow with `allow_interrupt=true`.
- [x] **Phase 4: VoBiz Primary Carrier**: Dedicated application routing to `/api/v1/telephony/inbound/run`.
- [x] **Phase 5: VoiceLink Secondary Carrier**: G.711 A-law 8kHz WebSocket bridging.
- [x] **Phase 6: Campaigns & Bulk Calling**: Validated CSV schema, canary execution, circuit-breaker rules.
- [x] **Phase 7: End-to-End Verification**: Complete boundary tests and isolation validation.
