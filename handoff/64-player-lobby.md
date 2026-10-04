# 64-player lobby

State: done.

Done: shared 64-player capacity and lobby counters; up to 128 username registrations per minute on demo Wi-Fi; independently selected authoritative hats with a shared purchased collection; remote players use the same local Blender SpongeBob model, independent rigs and morphs, and shared prepared mesh buffers. Compact screen-sized labels and 8-by-8 spawning ahead of the leader keep the starting camera clear. Broadcasts serialize once per room and use streaming gzip when supported. Roster DOM changes only when membership/ready state changes. Hat selections clear on loss and persist through normal level transitions.

Verified: 165 unit tests pass, including 64 active authoritative players, rejection of the 65th player, reconnect/free-slot behavior, 64 simultaneous compressed SSE connections from one registration address, plain SSE fallback, and 63 real-GLB remote avatars with independent animation and hats. Chromium checks passed for two-browser co-op and a full 64-player room rendering 63 imported teammates; final crowd screenshot: /tmp/sponge-64-player-lobby.png. Production build and doc check pass. Browser crowd test uses one real browser plus 63 API players; it does not measure 64 physical devices or venue Wi-Fi throughput.

Next: share the room code at the demo. Online play requires the Node game server; static hosting runs solo practice.
