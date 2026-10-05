{
  lib,
  buildNpmPackage,
  importNpmLock,
  nodejs_24,
  makeWrapper,
}:
buildNpmPackage {
  pname = "sponge-city";
  version = (builtins.fromJSON (builtins.readFile ../package.json)).version;
  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.unions [
      ../package.json
      ../package-lock.json
      ../tsconfig.json
      ../vite.config.ts
      ../playwright.config.ts
      ../index.html
      ../src
      ../config
      ../server
      ../public
      ../tests
    ];
  };
  nodejs = nodejs_24;
  npmDeps = importNpmLock { npmRoot = ../.; };
  npmConfigHook = importNpmLock.npmConfigHook;
  nativeBuildInputs = [ makeWrapper ];
  # Browser binaries are supplied separately in the development shell.
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
  installPhase = ''
    runHook preInstall
    mkdir -p $out/lib/sponge-city $out/bin
    cp -r dist server src config node_modules package.json $out/lib/sponge-city/
    # Server-side collision loading uses these assets through public/ paths.
    ln -s dist $out/lib/sponge-city/public
    makeWrapper ${nodejs_24}/bin/node $out/bin/sponge-city \
      --run 'export DATABASE_PATH="''${DATABASE_PATH:-''${XDG_STATE_HOME:-$HOME/.local/state}/sponge-city/accounts.sqlite}"' \
      --chdir $out/lib/sponge-city \
      --add-flags '--import tsx' \
      --add-flags "$out/lib/sponge-city/server/index.ts"
    runHook postInstall
  '';
  meta = {
    description = "Sponge City online game and production HTTP server";
    homepage = "https://github.com/myspace7164/spongebob-city";
    mainProgram = "sponge-city";
    platforms = lib.platforms.linux;
  };
}
