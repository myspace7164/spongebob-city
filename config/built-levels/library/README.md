# Level library

Each `*.json` file here is one level saved from the in-game level builder
(**💾 Save to library**, only while `npm run dev` runs). The file records who
saved it (GitHub username), notes, the story stage it was built for and the
place, spots, spawn, characters and objects.

Which level plays in each of the four stages, and which levels endless mode may
pick, lives in `../lineup.json` and is edited in the builder's **📚 Lineup**
screen. Commit and push these files to share them; teammates get them with
`git pull`. Every level has its own file, so people can build different levels
at the same time without git conflicts. Do not edit the files by hand.
