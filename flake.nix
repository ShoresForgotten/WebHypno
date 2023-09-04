{
  description = "Forgotten Hypno PWA";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let forAllSystems = function:
      nixpkgs.lib.genAttrs [
        "x86_64-linux"
        "aarch64-linux"
      ] (system: function nixpkgs.legacyPackages.${system});
    in {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodePackages.typescript
            glslang
          ];
        };
      });
      packages = forAllSystems (pkgs: {
        default = pkgs.stdenv.mkDerivation {
          pname = "Forgotten Hypno Web";
          version = "0.1.0";
          src = ./.;
          buildInputs = with pkgs; [
            nodePackages.typescript
          ];
          installPhase = ''cp -r out $out'';
        };
      });
    };
}
