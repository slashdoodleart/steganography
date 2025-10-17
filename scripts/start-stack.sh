#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PYTHON_BIN=${PYTHON_BIN:-"${ROOT_DIR}/.venv/bin/python"}
BACKEND_HOST=${BACKEND_HOST:-127.0.0.1}
BACKEND_PORT=${BACKEND_PORT:-8000}
RESEARCH_PORT=${RESEARCH_PORT:-8100}
FRONTEND_HOST=${FRONTEND_HOST:-127.0.0.1}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

if [[ ! -x ${PYTHON_BIN} ]]; then
  echo "error: python interpreter '${PYTHON_BIN}' not found or not executable" >&2
  exit 1
fi

cleanup() {
  trap - INT TERM EXIT
  if [[ -n ${BACKEND_PID:-} ]] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [[ -n ${RESEARCH_PID:-} ]] && kill -0 "${RESEARCH_PID}" 2>/dev/null; then
    kill "${RESEARCH_PID}" 2>/dev/null || true
  fi
  if [[ -n ${FRONTEND_PID:-} ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
  fi
}
trap cleanup INT TERM EXIT

(
  cd "${ROOT_DIR}/backend"
  "${PYTHON_BIN}" -m uvicorn app.main:app --host "${BACKEND_HOST}" --port "${BACKEND_PORT}"
) &
BACKEND_PID=$!
echo "[stack] backend listening on http://${BACKEND_HOST}:${BACKEND_PORT}" >&2

(
  cd "${ROOT_DIR}/research_suite"
  "${PYTHON_BIN}" -m uvicorn stegresearch.api.app:app --host "${BACKEND_HOST}" --port "${RESEARCH_PORT}"
) &
RESEARCH_PID=$!
echo "[stack] research suite listening on http://${BACKEND_HOST}:${RESEARCH_PORT}" >&2

(
  cd "${ROOT_DIR}"
  VITE_RESEARCH_API_BASE_URL=${VITE_RESEARCH_API_BASE_URL:-"http://${BACKEND_HOST}:${RESEARCH_PORT}"} \
    npm run dev -- --host "${FRONTEND_HOST}" --port "${FRONTEND_PORT}"
) &
FRONTEND_PID=$!
echo "[stack] frontend available at http://${FRONTEND_HOST}:${FRONTEND_PORT}" >&2

echo "[stack] press Ctrl+C to stop all services" >&2
wait -n
