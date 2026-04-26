{
  description = "discord-codex development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    systems.url = "github:nix-systems/default";
    flake-parts.url = "github:hercules-ci/flake-parts";
    flake-compat.url = "https://flakehub.com/f/edolstra/flake-compat/1.tar.gz";
    treefmt-nix.url = "github:numtide/treefmt-nix";
  };

  outputs =
    inputs@{ flake-parts, systems, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = import systems;
      imports = [
        inputs.treefmt-nix.flakeModule
      ];

      perSystem =
        { pkgs, ... }:
        {
          devShells.default = pkgs.mkShell {
            name = "discord-codex-dev";

            packages = with pkgs; [
              nodejs_22
              pnpm
              curl
              jq
              ripgrep
              fd
              fzf
              go-task
              git
              redis
            ];
          };

          treefmt = {
            programs.nixfmt.enable = pkgs.lib.meta.availableOn pkgs.stdenv.buildPlatform pkgs.nixfmt-rfc-style.compiler;
            programs.nixfmt.package = pkgs.nixfmt-rfc-style;
            programs.prettier.enable = true;
          };
        };
    };
}
