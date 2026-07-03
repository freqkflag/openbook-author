# Forgejo homelab CI

OpenBook Author uses a self-hosted [Forgejo](https://forgejo.org/) instance for Docker deploy smoke tests. The workflow builds the production image, runs a container, and curls key routes — the same check as `npm run test:deploy` locally.

| Setting | Value |
|---------|-------|
| **Forgejo URL** | `http://192.168.12.115:3000` |
| **Workflow** | `.forgejo/workflows/docker-smoke.yml` |
| **Runner label** | `docker` |
| **Default repo path** | `freqkflag/openbook-author` |

Forgejo listens on **port 3000** (not 80/443). The web UI and Git HTTP remotes use that port.

---

## What runs in CI

On every push or pull request to `main`:

1. Checkout source
2. `npm ci` (installs `wait-on` and other devDependencies used by the smoke script)
3. `npm run test:deploy` → `scripts/deploy-test.sh`:
   - `docker build`
   - `docker run` with a random host port
   - `wait-on` until the app responds
   - `curl` `/`, `/manifest.webmanifest`, `/sw.js`, `/api/ai/ollama-health`

Skip locally with `SKIP_DEPLOY_TEST=1`.

---

## Prerequisites on the homelab (192.168.12.115)

### 1. Enable Forgejo Actions (admin)

SSH to the homelab host and confirm Actions are enabled in Forgejo config (`app.ini`):

```ini
[actions]
ENABLED = true
DEFAULT_ACTIONS_URL = https://code.forgejo.org
```

Restart Forgejo after changes:

```bash
sudo systemctl restart forgejo
# or: docker compose restart forgejo — adjust for your install
```

In the Forgejo web UI (as site admin): **Site Administration → Actions → General** — ensure Actions are enabled.

### 2. Create the repository

If the repo does not exist yet, create **`openbook-author`** under your Forgejo user (default owner in docs: `freqkflag`).

**Web UI:** `+` → New Repository → name `openbook-author`, visibility as you prefer.

**API** (from a machine with a token — do not commit tokens):

```bash
export FORGEJO_URL="http://192.168.12.115:3000"
export FORGEJO_TOKEN="your-personal-access-token"   # .env.local only

curl -fsS -X POST "${FORGEJO_URL}/api/v1/user/repos" \
  -H "Authorization: token ${FORGEJO_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"openbook-author","private":false,"auto_init":false}'
```

Or run the helper script (reads env vars only):

```bash
source .env.local   # FORGEJO_URL, FORGEJO_TOKEN, optional FORGEJO_OWNER
bash scripts/forgejo-create-repo.sh
```

### 3. Push from your dev machine

Add the Forgejo remote (once):

```bash
git remote add forgejo "http://192.168.12.115:3000/freqkflag/openbook-author.git"
# SSH alternative if Forgejo SSH is on port 22:
# git remote add forgejo "ssh://git@192.168.12.115/freqkflag/openbook-author.git"
```

Push `main`:

```bash
git push -u forgejo main
```

When prompted for HTTP credentials, use your Forgejo username and a **personal access token** (not your account password if token auth is required).

### 4. Install and register `act_runner`

The workflow job uses `runs-on: docker`. You need a runner registered with that label and **Docker CLI + daemon access** on the runner host.

On the homelab (or a dedicated CI machine that can reach Forgejo and Docker):

```bash
export FORGEJO_URL="http://192.168.12.115:3000"
export FORGEJO_RUNNER_TOKEN="registration-token-from-forgejo-ui"
export RUNNER_NAME="homelab-docker-1"
export RUNNER_LABELS="docker"

bash scripts/forgejo-setup-runner.sh
```

**Registration token** (Forgejo UI):

- **Instance runner:** Site Administration → Actions → Runners → Create new Runner
- **Repo runner:** Repository → Settings → Actions → Runners → Create new Runner

The setup script downloads `act_runner`, registers it, and prints how to enable the systemd unit.

#### Runner requirements

| Requirement | Notes |
|-------------|--------|
| Docker Engine | `docker info` must succeed for the user running `act_runner` |
| Docker socket | Runner user in `docker` group, or socket mounted for containerized runner |
| Node.js 20+ | Used by workflow steps (`setup-node`); runner host should allow job containers or host execution per your act_runner config |
| Outbound network | Pull `actions/checkout`, `actions/setup-node`, and npm registry |
| Disk | Enough space for Docker layers + `node_modules` |

#### systemd (optional)

Copy and edit the unit template, then enable:

```bash
sudo cp deploy/forgejo/act_runner.service /etc/systemd/system/forgejo-act-runner.service
sudo systemctl daemon-reload
sudo systemctl enable --now forgejo-act-runner
```

Set `User`, `WorkingDirectory`, and `EnvironmentFile` in the unit to match your install (see template comments).

### 5. Verify CI

1. Push a commit to `main` on Forgejo
2. Open **Actions** tab on the repo
3. Confirm **Docker smoke** completes green

---

## Environment variables (local only)

Add to `.env.local` (never commit). `.env.example` lists optional names:

| Variable | Purpose |
|----------|---------|
| `FORGEJO_URL` | Base URL, e.g. `http://192.168.12.115:3000` |
| `FORGEJO_TOKEN` | Personal access token for API / HTTP git push |
| `FORGEJO_OWNER` | Username or org (default `freqkflag`) |
| `FORGEJO_REPO` | Repository name (default `openbook-author`) |
| `FORGEJO_RUNNER_TOKEN` | One-time runner registration token from Forgejo UI |

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Workflow queued forever | No runner with label `docker`, or runner offline |
| `docker: command not found` in job | Runner host lacks Docker or job runs in isolated container without Docker |
| `docker daemon not available` | Runner user not in `docker` group; socket not mounted |
| `npx wait-on` / `npm ci` fails | Missing `npm ci` step (fixed in workflow) or network blocked on runner |
| `Only signed in user is allowed to call APIs` | Unauthenticated API call; set `FORGEJO_TOKEN` |
| Cannot push to Forgejo | Repo missing, wrong remote URL, or need token for HTTP auth |

---

## Related files

- `.forgejo/workflows/docker-smoke.yml` — CI workflow
- `scripts/deploy-test.sh` — smoke test script
- `scripts/forgejo-setup-runner.sh` — register `act_runner`
- `scripts/forgejo-create-repo.sh` — create repo via API
- `deploy/forgejo/act_runner.service` — systemd unit template
