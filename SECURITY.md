# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `0.2.x` | ✅ Active development |
| `< 0.2` | ❌ No longer supported |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Use one of these channels:

1. **[GitHub Private Security Advisories](https://github.com/freqkflag/openbook-author/security/advisories/new)** (preferred)
2. Email the repository owner via their GitHub profile contact link if private advisories are unavailable.

Include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected version or commit
- Any proof-of-concept (keep minimal)

We aim to acknowledge reports within **7 days** and will coordinate disclosure timing with you.

## Scope notes

OpenBook Author is primarily a **local-first** authoring app:

- Book data is stored in **browser localStorage** and optional **`.openbook`** files on disk (Electron).
- **AI API keys** are entered in the client and sent to `/api/ai`, which proxies requests to the configured provider. Keys are not stored on the server filesystem by default.
- EPUB/IBA import parses user-supplied files — malformed archives should fail safely without executing embedded scripts.

Out of scope for this project’s threat model unless clearly exploitable in default use:

- Issues requiring physical access to an unlocked machine
- Social engineering
- Denial of service via extremely large local files (unless it causes memory exhaustion without user action)

## Safe harbor

We appreciate responsible disclosure and will credit reporters in release notes when fixes ship, if you wish.
