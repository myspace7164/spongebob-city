# Level builder version history

The local development builder writes one JSON history file per level here when
a draft is applied or a saved version is restored. Each entry keeps the level
state that was replaced; restoring the built-in state removes that level's
override from `../index.ts`. Keep these files with the project so earlier
applied level states remain available to restore.
