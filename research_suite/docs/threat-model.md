# Threat Model

- **Scope**: Synthetic datasets, closed-loop lab experiments, and provenance-focused watermarking.
- **Adversaries**: Attempt to remove or forge steganographic payloads within controlled media.
- **Assets**: Payload confidentiality, watermark integrity, experimental reproducibility.
- **Assumptions**: No hostile network access; analysts operate in sandboxed environments.
- **Controls**:
  - Capability negotiation layer blocks unsupported carriers/methods.
  - API refuses to process non-local filesystems or non-loopback interfaces unless explicitly whitelisted.
  - Structured logging and audit trails capture every operation with deterministic seeds.
