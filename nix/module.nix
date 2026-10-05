self:
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.services.sponge-city;
  inherit (lib)
    mkEnableOption
    mkOption
    mkIf
    types
    ;
in
{
  options.services.sponge-city = {
    enable = mkEnableOption "the Sponge City game server";
    package = mkOption {
      type = types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.sponge-city;
      description = "Sponge City server package to run.";
    };
    host = mkOption {
      type = types.str;
      default = "127.0.0.1";
      description = "HTTP bind address.";
    };
    port = mkOption {
      type = types.port;
      default = 3000;
      description = "HTTP listening port.";
    };
    publicOrigin = mkOption {
      type = types.str;
      default = "";
      example = "https://game.example.org";
      description = "Public HTTPS origin, without a path or trailing slash.";
    };
    trustProxy = mkOption {
      type = types.enum [
        "none"
        "loopback"
      ];
      default = "loopback";
      description = "Whether to trust forwarded client addresses from a loopback proxy.";
    };
    stateDirectory = mkOption {
      type = types.strMatching "[a-zA-Z0-9_-]+";
      default = "sponge-city";
      description = "Directory name under /var/lib for persistent SQLite state.";
    };
    environment = mkOption {
      type = types.attrsOf types.str;
      default = { };
      description = "Additional non-secret environment variables. Use environmentFile for secrets.";
    };
    environmentFile = mkOption {
      type = types.nullOr types.str;
      default = null;
      example = "/run/secrets/sponge-city.env";
      description = "Runtime environment file path; never copied into the Nix store. May override service variables.";
    };
    openFirewall = mkOption {
      type = types.bool;
      default = false;
      description = "Open the backend TCP port. Usually leave disabled behind a local HTTPS proxy.";
    };
    nginx.enable = mkEnableOption "an nginx HTTPS reverse proxy (ACME)";
    nginx.domain = mkOption {
      type = types.str;
      default = "";
      example = "game.example.org";
      description = "Public DNS name for nginx and its ACME certificate.";
    };
  };
  config = mkIf cfg.enable {
    assertions = [
      {
        assertion = builtins.match "https://[^/?#]+" cfg.publicOrigin != null;
        message = "services.sponge-city.publicOrigin must be an HTTPS origin without a path or trailing slash.";
      }
      {
        assertion =
          !cfg.nginx.enable
          || (
            cfg.host == "127.0.0.1"
            && cfg.publicOrigin == "https://${cfg.nginx.domain}"
            && cfg.nginx.domain != ""
          );
        message = "Sponge City nginx requires host = 127.0.0.1 and publicOrigin = https://<nginx.domain>.";
      }
    ];
    networking.firewall.allowedTCPPorts =
      lib.optionals cfg.openFirewall [ cfg.port ]
      ++ lib.optionals cfg.nginx.enable [
        80
        443
      ];
    systemd.services.sponge-city = {
      description = "Sponge City game server";
      wantedBy = [ "multi-user.target" ];
      after = [ "network.target" ];
      environment = cfg.environment // {
        NODE_ENV = "production";
        HOST = cfg.host;
        PORT = toString cfg.port;
        PUBLIC_ORIGIN = cfg.publicOrigin;
        TRUST_PROXY = cfg.trustProxy;
        DATABASE_PATH = "/var/lib/${cfg.stateDirectory}/accounts.sqlite";
      };
      serviceConfig = {
        ExecStart = lib.getExe cfg.package;
        DynamicUser = true;
        StateDirectory = cfg.stateDirectory;
        StateDirectoryMode = "0700";
        UMask = "0077";
        Restart = "on-failure";
        RestartSec = 5;
        TimeoutStopSec = 15;
        NoNewPrivileges = true;
        PrivateTmp = true;
        PrivateDevices = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;
        RestrictSUIDSGID = true;
        RestrictAddressFamilies = [
          "AF_UNIX"
          "AF_INET"
          "AF_INET6"
        ];
        CapabilityBoundingSet = "";
        # V8 requires executable memory for its JIT.
      }
      // lib.optionalAttrs (cfg.environmentFile != null) {
        EnvironmentFile = cfg.environmentFile;
      };
    };
    services.nginx = mkIf cfg.nginx.enable {
      enable = true;
      virtualHosts.${cfg.nginx.domain} = {
        enableACME = true;
        forceSSL = true;
        locations."/" = {
          proxyPass = "http://127.0.0.1:${toString cfg.port}";
          # Supply headers here even when the host enables global proxy defaults.
          recommendedProxySettings = false;
          extraConfig = ''
            proxy_set_header Host $http_host;
            proxy_set_header X-Forwarded-For $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering off;
            proxy_read_timeout 3600s;
          '';
        };
      };
    };
  };
}
