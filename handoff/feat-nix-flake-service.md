# Handoff: Nix flake and NixOS service

Status: done · Updated: 2026-10-05 · Branch: feat/nix-flake-service

## Goal
Install and run the game from another system through a flake, provide standard NixOS service options, and document usage.

## Done
- Added pinned flake packages/apps and development shells for x86_64-linux and aarch64-linux.
- Packaged the built client, TypeScript server, dependencies and server-side collision assets; launcher works from any directory and defaults to user-local persistent state.
- Added services.sponge-city with package, host, port, public origin, proxy trust, state directory, environment, runtime environment file, firewall and optional nginx HTTPS settings.
- Added module evaluation checks and a packaged production-server smoke test covering assets, account creation, secure cookies, host validation and SQLite storage.
- Documented standalone installation, NixOS integration, all options, service management and state in README.md.

## Validation
- Nix build and x86_64-linux flake checks passed; 169 unit tests and TypeScript checks passed.
- ARM outputs are evaluated, but runtime/build verification requires an ARM builder.
- No live NixOS deployment or ACME issuance performed; configuration checks and the packaged server smoke test validate the supplied integration.

## Next
No implementation work remains. Deploy using the README example on the target host and supply its DNS name and ACME contact.

## Files
- flake.nix and flake.lock: public outputs and pinned nixpkgs.
- nix/package.nix, nix/module.nix, nix/checks.nix: package, service and verification.
- README.md: installation and hosting instructions.

## Local files
The pre-existing untracked reference photograph stays local and is excluded from the package source and commit.
