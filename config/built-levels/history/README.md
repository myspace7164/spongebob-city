# Level library version history

The local development builder writes one JSON history file per library level
here (named like the level's file in `../library/`) whenever a saved level is
overwritten, restored or deleted. Each entry keeps the state that was replaced,
so **Earlier versions → Restore** in the builder can bring it back. Keep these
files with the project.
