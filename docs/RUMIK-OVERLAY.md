# Rumik TTS Overlay for Dograh / Pipecat

This document details how to overlay Rumik's high-expressiveness Indian-English conversational TTS engine into Dograh's audio pipeline.

---

## 1. Critical Dependency Warning

> [!CAUTION]
> **Must Use `--no-deps`**:
> Dograh maintains a vendored, customized fork of `pipecat-ai` inside its worker and API containers.
> A standard `pip install pipecat-rumik` will pull downstream stock `pipecat-ai` dependencies, which **overwrites Dograh's vendored fork and breaks the container's voice pipeline**.
> Always use:
> ```bash
> pip install --no-deps pipecat-rumik
> ```

---

## 2. Automated Overlay Procedure

The overlay is applied via `deploy/02-build-rumik-overlay.sh`. The steps executed are:

1. Identify the running Dograh worker/API container:
   ```bash
   CONTAINER_ID=$(docker ps -q -f name=dograh-worker -f name=dograh-api | head -n 1)
   ```
2. Execute the isolated pip installation inside the container:
   ```bash
   docker exec -u root "$CONTAINER_ID" pip install --no-deps pipecat-rumik
   ```
3. Register Rumik as a valid TTS provider in Dograh's provider registry (`/app/services/tts/registry.py` or configuration schema):
   ```python
   # Registration of RumikTTSService
   from pipecat_rumik import RumikTTSService, RumikHttpTTSService

   PROVIDERS["rumik"] = {
       "name": "Rumik AI",
       "voices": [
           {"id": "mulberry", "name": "Silk Mulberry (Warm Indian English)", "lang": "en-IN"},
           {"id": "saffron", "name": "Silk Saffron (Conversational Hinglish)", "lang": "hi-IN"},
           {"id": "lotus", "name": "Silk Lotus (Expressive Clear)", "lang": "en-IN"}
       ],
       "service_class": RumikTTSService,
       "default_sample_rate": 24000
   }
   ```
4. Restart the Dograh worker service gracefully to load the module:
   ```bash
   docker restart "$CONTAINER_ID"
   ```

---

## 3. Smoke Test Verification

Verify Rumik synthesis with a read-only smoke test producing 24 kHz mono PCM audio:

```bash
curl -s -X POST https://api.rumik.ai/v1/tts/synthesize \
  -H "Authorization: Bearer $RUMIK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, thank you for calling. How can I assist you today?",
    "voice": "mulberry",
    "sample_rate": 24000,
    "format": "wav"
  }' -o smoke_test.wav
```
Confirm the audio file is a valid 24 kHz mono WAV file.
