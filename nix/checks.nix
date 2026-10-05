{
  self,
  nixpkgs,
  pkgs,
  system,
}:
let
  evaluate =
    settings:
    (nixpkgs.lib.nixosSystem {
      inherit system;
      modules = [
        self.nixosModules.default
        { services.sponge-city = settings; }
      ];
    }).config;
  basic = evaluate {
    enable = true;
    publicOrigin = "https://game.example.org";
  };
  proxy = evaluate {
    enable = true;
    publicOrigin = "https://game.example.org";
    port = 3456;
    stateDirectory = "game-state";
    environment.EXTRA_SETTING = "test";
    environmentFile = "/run/secrets/game.env";
    nginx = {
      enable = true;
      domain = "game.example.org";
    };
  };
  exposed = evaluate {
    enable = true;
    publicOrigin = "https://game.example.org";
    openFirewall = true;
  };
  disabled = evaluate { enable = false; };
  invalid = evaluate {
    enable = true;
    publicOrigin = "http://game.example.org/";
  };
in
{
  module =
    assert basic.systemd.services.sponge-city.serviceConfig.DynamicUser;
    assert
      basic.systemd.services.sponge-city.environment.DATABASE_PATH
      == "/var/lib/sponge-city/accounts.sqlite";
    assert !(builtins.elem 3000 basic.networking.firewall.allowedTCPPorts);
    assert builtins.elem 3000 exposed.networking.firewall.allowedTCPPorts;
    assert !(disabled.systemd.services ? sponge-city);
    assert proxy.systemd.services.sponge-city.environment.PORT == "3456";
    assert proxy.systemd.services.sponge-city.environment.EXTRA_SETTING == "test";
    assert proxy.systemd.services.sponge-city.serviceConfig.EnvironmentFile == "/run/secrets/game.env";
    assert proxy.systemd.services.sponge-city.serviceConfig.StateDirectory == "game-state";
    assert
      proxy.services.nginx.virtualHosts."game.example.org".locations."/".proxyPass
      == "http://127.0.0.1:3456";
    assert builtins.all (port: builtins.elem port proxy.networking.firewall.allowedTCPPorts) [
      80
      443
    ];
    assert builtins.any (
      item: !item.assertion && builtins.match ".*publicOrigin.*" item.message != null
    ) invalid.assertions;
    pkgs.runCommand "sponge-city-module-check" { } ''
      touch $out
    '';
  server =
    pkgs.runCommand "sponge-city-server-check"
      {
        nativeBuildInputs = [ pkgs.curl ];
      }
      ''
        export XDG_STATE_HOME=$TMPDIR/state
            export NODE_ENV=production PUBLIC_ORIGIN=https://game.example.org
            export HOST=127.0.0.1 PORT=31987
            cd "$TMPDIR"
            ${nixpkgs.lib.getExe self.packages.${system}.sponge-city} > server.log 2>&1 &
            server_pid=$!
            trap 'kill "$server_pid"; wait "$server_pid" || true' EXIT
            ready=false
            for attempt in $(seq 1 60); do
              if curl -fsS -H 'Host: game.example.org' http://127.0.0.1:31987/ > index.html; then
                ready=true
                break
              fi
              sleep 1
            done
            if ! $ready; then cat server.log; exit 1; fi
            test -s index.html
            test "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:31987/)" = 421
            curl -fsS -H 'Host: game.example.org' http://127.0.0.1:31987/models/basel-city.glb -o model.glb
            test -s model.glb
            curl -fsS -D headers -H 'Host: game.example.org' -H 'Origin: https://game.example.org' \
              -H 'Content-Type: application/json' -d '{"username":"nix_smoke"}' \
              http://127.0.0.1:31987/api/account > account.json
            grep -q nix_smoke account.json
            grep -q 'Secure' headers
        test -s "$XDG_STATE_HOME/sponge-city/accounts.sqlite"
            touch $out
      '';
}
