# Transparent Pricing Model: AI Runtime from ~₹1/minute

This document provides a transparent, verifiable mathematical breakdown of the AI runtime cost for the Rumik ₹1 AI Voice Agent stack.

---

## 1. Scope and Boundary Definition

> [!IMPORTANT]
> **Strict Separation of Concerns**:
> The claim **"AI runtime from about ₹1 per minute"** encompasses only the AI inference pipeline: Speech-to-Text (STT), Large Language Model inference (LLM), and Text-to-Speech (TTS).
> Telephony (VoBiz, SIP trunks, PSTN minutes, DID rentals), cloud hosting/compute, and taxes are external carrier/infrastructure costs and are explicitly excluded from this metric.

---

## 2. Component Unit Economics

| Component | Provider & Tier | Unit Rate (USD) | Unit Rate (INR @ 1 USD = ₹86.5) | Typical 1-Min Audio Usage | 1-Min Cost (INR) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **STT** | Deepgram Nova-3 Multilingual | $0.0043 / min | ₹0.372 / min | 60 sec audio streaming | **₹0.372** |
| **LLM** | Groq Llama 3.3 70B Versatile | $0.59 / 1M input tok<br>$0.79 / 1M output tok | ₹0.051 / 1k input<br>₹0.068 / 1k output | ~600 input tokens<br>~180 output tokens | **₹0.043** |
| **TTS** | Rumik Silk Mulberry | $0.0075 / 1k chars | ₹0.648 / 1k chars | ~900 characters spoken | **₹0.583** |
| **Total** | **AI Pipeline Total** | — | — | — | **~₹0.998 / min** |

*(Note: Under Google Gemini 3.5 Flash Lite as the LLM alternative, token pricing is even lower: $0.075 / 1M input tokens and $0.30 / 1M output tokens, resulting in ~₹0.015 for LLM and a total AI runtime of **~₹0.970 / min**).*

---

## 3. Real Call Token & Character Budgets

A standard human-agent conversational minute comprises approximately 3-4 conversational turns:
- **Human Speech**: ~25-30 seconds of user audio transcribed into ~75 words (~100 tokens).
- **Agent Speech**: ~25-30 seconds of speech output containing ~120-150 words (~900 characters / 180 tokens).
- **Prompt & History**: ~500 tokens of system prompt and rolling turn context.

---

## 4. Telephony Exclusion Policy

Telephony pricing varies substantially across providers, country codes, and carriers:
- **VoBiz Outbound (India PSTN)**: Billed per pulse/second directly by VoBiz.
- **VoiceLink Carrier**: Secondary carrier rate based on reseller terms and G.711 trunking.
- **DID Numbers**: Monthly fixed rental fee per phone number.

Never add carrier pulse rates or server VPS charges to the ₹1 AI runtime metric.
