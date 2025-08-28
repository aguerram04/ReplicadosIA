# Firewall Configuration for HeyGen Interactive Avatar (LiveKit)

This document lists the minimum and recommended egress rules to allow web, mobile, and iOS apps to connect to HeyGen (API) and LiveKit (signaling/media).

## Minimum (Basic Functionality)

| Host                  | Port/Proto          | Purpose                                   |
| --------------------- | ------------------- | ----------------------------------------- |
| \*.livekit.cloud      | TCP 443 (WSS)       | Signaling via WebSocket                   |
| \*.turn.livekit.cloud | TCP 443 (TLS)       | TURN over TLS fallback when UDP blocked   |
| \*.host.livekit.cloud | UDP 3478            | TURN/UDP for ICE (P2P relays)             |
| api.heygen.com        | TCP 443 (HTTPS/WSS) | HeyGen APIs and Avatar signaling/webhooks |

Notes

- All connections are encrypted (TLS/DTLS/SRTP).
- If wildcard domains are not permitted, use the per‑region host list from LiveKit docs and replace with your assigned domain (e.g., heygen-feapbkvq.livekit.cloud).

## Recommended (Best Quality)

| Host         | Port/Proto      | Purpose                 |
| ------------ | --------------- | ----------------------- |
| Any (egress) | UDP 50000–60000 | WebRTC media (RTP/RTCP) |
| Any (egress) | TCP 7881        | WebRTC TCP fallback     |

Operational tips

- Prefer UDP; quality degrades when forced through TCP/TURN‑TLS.
- Enable UDP hole‑punching/NAT hairpin if supported.
- Avoid symmetric NAT where possible.

## Testing

- Browser/WebRTC capabilities: https://livekit.io/webrtc/browser-test
- Connection test (use url and access_token from /v1/streaming.new): https://livekit.io/connection-test

## References

- LiveKit Firewall/Networking: https://docs.livekit.io/home/cloud/firewall/
- HeyGen Streaming API + LiveKit: https://docs.heygen.com/docs/streaming-api-integration-with-livekit-v2

## Security

- Keep HEYGEN_API_KEY server‑side; mint short‑lived session tokens from your backend (see avatar-ai-app/src/app/api/heygen/streaming/create-token/route.ts or heygen-token-service/).
- Do not open inbound ports; these are outbound egress rules from clients to internet services.
