# Troubleshooting & Operational Failure Recovery

This guide covers common operational failure signatures, causes, and exact mitigation steps for the Rumik ₹1 AI Voice Agent Stack.

---

## 1. Telephony Failures

### Signature: Inbound VoBiz call does not answer / immediately drops
- **Likely Cause**:
  1. `answer_url` mismatch or points to an ephemeral tunnel that has expired.
  2. The VoBiz application is not attached to the incoming DID phone number.
  3. The answer URL does not use `POST` method.
- **Verification**:
  - Check the active VoBiz application:
    ```bash
    curl -s -u "$VOBIZ_AUTH_ID:$VOBIZ_AUTH_TOKEN" \
      https://api.vobiz.ai/v1/applications
    ```
  - Ensure the `answer_url` matches `https://<DOGRAH_BACKEND>/api/v1/telephony/inbound/run` exactly and the HTTP method is `POST`.
  - Check that `$VOBIZ_NUMBER` is attached to this exact application ID.

### Signature: VoiceLink audio sounds distorted or silent
- **Likely Cause**:
  - Codec mismatch. VoiceLink Indian mobile carrier traffic routes over **G.711 A-law at 8000 Hz**, not µ-law or 16000 Hz PCM.
- **Mitigation**:
  - Ensure your media receiver inspects the inbound start frame and negotiates `audio/PCMA` (A-law) 8 kHz.
  - Verify that the DID has incoming service enabled and that sufficient channels are provisioned.

---

## 2. Audio Pipeline & Barge-In Issues

### Signature: Agent keeps talking over the user (Barge-in fails)
- **Likely Cause**:
  1. VAD sensitivity is too low or client-side microphone echo cancellation is disabled.
  2. `allow_interrupt` is set to `false` on the active workflow node.
  3. Audio playback buffer in the browser is not being explicitly flushed on cancel.
- **Mitigation**:
  - Verify `getUserMedia` parameters:
    ```javascript
    navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    ```
  - In the browser AudioContext, call `source.stop()` and clear the chunk queue immediately upon receiving an `interrupt` frame from the server.
  - Confirm `allow_interrupt=true` on all speaking nodes in Dograh.

### Signature: Dograh API container crashes after installing `pipecat-rumik`
- **Likely Cause**:
  - `pip install pipecat-rumik` was executed without `--no-deps`, overwriting Dograh's vendored Pipecat fork.
- **Mitigation**:
  - Re-pull the clean Dograh container: `docker compose pull && docker compose up -d`.
  - Re-run `deploy/02-build-rumik-overlay.sh` ensuring the `--no-deps` flag is strictly preserved.

---

## 3. Browser "Talk to It" Session Errors

### Signature: "Microphone permission denied" or "NotAllowedError"
- **Likely Cause**:
  - The browser blocked microphone access or the origin is not secure (must be `localhost` or `https://`).
- **Mitigation**:
  - Access via `http://localhost:8787` (localhost is treated as secure) or ensure SSL certificates are configured for remote domains.
  - Check browser permissions for the origin.

### Signature: High Turn Latency (>1.5s)
- **Likely Cause**:
  - Deepgram STT endpoint latency or Groq LLM token generation queue delay.
- **Mitigation**:
  - Inspect the diagnostic panel in Voice Studio to see whether the delay is in STT interim capture, LLM TTFT, or TTS synthesis.
  - If using Gemini, verify `gemini-3.5-flash-lite` is selected for maximum speed.
