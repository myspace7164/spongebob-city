{
  description = "Sponge City game server and NixOS service";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        rec {
          sponge-city = pkgs.callPackage ./nix/package.nix { };
          default = sponge-city;
        }
      );
      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/sponge-city";
          meta.description = "Run the Sponge City game server";
        };
      });
      nixosModules.sponge-city = import ./nix/module.nix self;
      nixosModules.default = self.nixosModules.sponge-city;
      checks = forAllSystems (
        system:
        import ./nix/checks.nix {
          inherit self nixpkgs system;
          pkgs = nixpkgs.legacyPackages.${system};
        }
      );
      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.nodejs_24
              pkgs.chromium
              pkgs.nixfmt
            ];
            CHROMIUM_EXECUTABLE = "${pkgs.chromium}/bin/chromium";
            LD_LIBRARY_PATH = "/run/opengl-driver/lib";
          };
        }
      );
    };
}
