# Nix-packaged Chromium brings its required libraries with it.
{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  packages = [ pkgs.nodejs pkgs.chromium ];
  CHROMIUM_EXECUTABLE = "${pkgs.chromium}/bin/chromium";
  LD_LIBRARY_PATH = "/run/opengl-driver/lib";
}
