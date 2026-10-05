# Handoff: generic hosting configuration

Status: done · Updated: 2026-10-05

Removed the public instance's domain from deployment examples, environment examples,
security test fixtures and development-server settings. Deployment examples use
game.example.org; Vite uses its default local-host restrictions. The public-instance
listing in README.md is the sole remaining reference to the hosted domain.

Validation: repository search, unit tests, TypeScript check and documentation check.
No further implementation work remains.
