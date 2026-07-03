#!/usr/bin/env bash
# Register and optionally install Forgejo act_runner for Docker CI.
# No secrets in repo — pass tokens via environment variables only.
#
# Required:
#   FORGEJO_URL          e.g. http://192.168.12.115:3000
#   FORGEJO_RUNNER_TOKEN registration token from Forgejo UI
#
# Optional:
#   RUNNER_NAME          default: $(hostname)-docker
#   RUNNER_LABELS        default: docker
#   ACT_RUNNER_VERSION   default: 0.2.11
#   INSTALL_DIR          default: /opt/forgejo-act-runner
#   RUNNER_USER          default: current user (systemd install only)
#   INSTALL_SYSTEMD      set to 1 to copy unit template (requires sudo)

set -euo pipefail

FORGEJO_URL="${FORGEJO_URL:-http://192.168.12.115:3000}"
FORGEJO_RUNNER_TOKEN="${FORGEJO_RUNNER_TOKEN:-}"
RUNNER_NAME="${RUNNER_NAME:-$(hostname -s 2>/dev/null || hostname)-docker}"
RUNNER_LABELS="${RUNNER_LABELS:-docker}"
ACT_RUNNER_VERSION="${ACT_RUNNER_VERSION:-0.2.11}"
INSTALL_DIR="${INSTALL_DIR:-/opt/forgejo-act-runner}"

if [[ -z "${FORGEJO_RUNNER_TOKEN}" ]]; then
  echo "error: set FORGEJO_RUNNER_TOKEN (registration token from Forgejo Actions settings)" >&2
  exit 1
fi

FORGEJO_URL="${FORGEJO_URL%/}"

case "$(uname -m)" in
  x86_64|amd64) RUNNER_ARCH="amd64" ;;
  aarch64|arm64) RUNNER_ARCH="arm64" ;;
  *)
    echo "error: unsupported architecture: $(uname -m)" >&2
    exit 1
    ;;
esac

RUNNER_OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
TARBALL="act_runner-${ACT_RUNNER_VERSION}-${RUNNER_OS}-${RUNNER_ARCH}"
DOWNLOAD_URL="https://code.forgejo.org/forgejo/runner/releases/download/v${ACT_RUNNER_VERSION}/${TARBALL}.tar.gz"

echo "Installing act_runner v${ACT_RUNNER_VERSION} (${RUNNER_OS}/${RUNNER_ARCH}) to ${INSTALL_DIR}"

if [[ "$(id -u)" -eq 0 ]]; then
  mkdir -p "${INSTALL_DIR}"
else
  sudo mkdir -p "${INSTALL_DIR}"
  sudo chown "$(id -u):$(id -g)" "${INSTALL_DIR}"
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "${tmpdir}"' EXIT

curl -fsSL "${DOWNLOAD_URL}" -o "${tmpdir}/act_runner.tar.gz"
tar -xzf "${tmpdir}/act_runner.tar.gz" -C "${tmpdir}"
install -m 755 "${tmpdir}/act_runner" "${INSTALL_DIR}/act_runner"

cd "${INSTALL_DIR}"

if [[ ! -f .runner ]]; then
  echo "Registering runner '${RUNNER_NAME}' with labels '${RUNNER_LABELS}'..."
  ./act_runner register \
    --no-interactive \
    --instance "${FORGEJO_URL}" \
    --token "${FORGEJO_RUNNER_TOKEN}" \
    --name "${RUNNER_NAME}" \
    --labels "${RUNNER_LABELS}"
else
  echo "Runner already registered (.runner exists); skipping register"
fi

if ! docker info >/dev/null 2>&1; then
  echo "warning: docker daemon not available for $(whoami) — add user to docker group or fix socket access" >&2
fi

echo ""
echo "Runner installed at ${INSTALL_DIR}"
echo "Start manually:"
echo "  cd ${INSTALL_DIR} && ./act_runner daemon"
echo ""
echo "Or enable systemd (after editing deploy/forgejo/act_runner.service):"
echo "  sudo cp deploy/forgejo/act_runner.service /etc/systemd/system/forgejo-act-runner.service"
echo "  # Set User= and WorkingDirectory=${INSTALL_DIR} in the unit file"
echo "  sudo systemctl daemon-reload && sudo systemctl enable --now forgejo-act-runner"

if [[ "${INSTALL_SYSTEMD:-}" == "1" ]]; then
  unit_dest="/etc/systemd/system/forgejo-act-runner.service"
  sed \
    -e "s|@INSTALL_DIR@|${INSTALL_DIR}|g" \
    -e "s|@RUNNER_USER@|${RUNNER_USER:-$(whoami)}|g" \
    "$(dirname "$0")/../deploy/forgejo/act_runner.service" \
    | sudo tee "${unit_dest}" >/dev/null
  sudo systemctl daemon-reload
  sudo systemctl enable --now forgejo-act-runner
  echo "systemd unit installed: ${unit_dest}"
fi
