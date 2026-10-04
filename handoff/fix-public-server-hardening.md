# Public server hardening

State: done.

Done: Dedicated production server defaults to loopback, requires an HTTPS public origin, applies browser security headers and HTTP resource limits. API traffic, event streams and player capacity are bounded; requests validate origin and JSON body size. Container runs as an unprivileged user with production dependencies. Added a Caddy HTTPS proxy example.

Validation: Production build and 169 unit/security tests pass. Three online browser scenarios pass (the leaderboard scenario requires isolated DATABASE_PATH=:memory: to avoid existing local scores). Production page and solo start pass with CSP enabled. Runtime npm audit reports zero known vulnerabilities. Staged-change and pre-push privacy checks and strict documentation checks pass. The full-history privacy audit detects personal email addresses in earlier commits; remediation needs coordinated team approval for a history rewrite. Docker and Caddy are unavailable locally, so their templates were inspected but not executed.

Next: On the target server, follow README production commands, configure HTTPS, persistent storage and the service manager. No remote host deployment was performed.

Limits: Cookie identities have no account recovery. Solo survival times depend on browser start/stop events and are not cheat-proof. Distributed denial of service and disk exhaustion need host/proxy controls and monitoring.
