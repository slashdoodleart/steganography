# API Overview

Base URL (default): `http://localhost:8000`

## Endpoints

- `GET /health`: Service status and build metadata.
- `POST /embed`: Embed payload into a carrier. Multipart form with carrier type, method, payload, parameters.
- `POST /extract`: Recover payload from media and report metrics.
- `POST /detect`: Run steganalysis pipeline and return probabilities, ROC-AUC reference, and diagnostic metrics.
- `GET /metrics`: Return benchmark outcomes (capacity, imperceptibility, robustness).

All responses contain structured JSON with deterministic operation IDs and logging correlation IDs.
