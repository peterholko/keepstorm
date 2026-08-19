# Keepstorm atlas sources

This directory preserves the source material used for sprite-background cleanup.
Nothing here is loaded by the game at runtime.

## Directories

- `original-atlases/` contains byte-for-byte backups of the six atlas PNGs from
  `public/game/`, captured on 2026-08-18 before any regeneration.
- `magenta-atlases/` contains image-editor regenerations made from those backups.
  Their white/light-gray checkerboard backgrounds were replaced with saturated
  chroma-magenta backgrounds, including enclosed negative spaces.

The previous files in `public/game/` were not replaced. Versioned copies of the
magenta regenerations live there with a `-magenta-v1` suffix and are the atlases
referenced by the game.

## Magenta-key note

The generated magenta is visually flat but is not encoded as one exact RGB value.
Use a magenta hue or color-distance threshold when extracting alpha; do not test
only for exact `#FF00FF`. Preserve intentional glows and feathered sprite edges
when producing the final RGBA atlases.

## SHA-256 checksums

### Original backups

```text
11dd4ef9c73025111851e46198538aa76f22c06340661dd18037765eb2de7b3e  briarcrown-depth-atlas.png
2441766fad36942c4eca05ca0c321dca960180b5ca8d0568760235042f821f8d  daybreak-atlas.png
803f3ed881ebe4bd0eaad9aed5f05b67fd92630ab606896dbeeffe1f13aaa317  daybreak-depth-atlas.png
7be46f7a8cf161783a0c12670cc90b57851be2d388b7afa6348c79c5f2a50e5d  icons-atlas.png
2701e22ad85feed60eacc487c41b7e23bd4779929e283a711799c90801c040a3  nightveil-atlas.png
4fbf7b7997e8fae9238fe3003a598c13ca04c53b065c3819915f985d0f708bc2  stormglass-depth-atlas.png
```

### Magenta regenerations

```text
7f2bb6d62711dd03ea17111fab7d64a4832e7c43626fe2149ab12f8ec0c6931d  briarcrown-depth-atlas.png
66b9afd25c790ae9f4b99a335fc381a182546c4d973c9106cd636e47b641ef07  daybreak-atlas.png
e6e9c3d64806cdcaf2ac69b0fe5a3087451001d02efcd7695106d3858dd15543  daybreak-depth-atlas.png
47db2d7325402ee4631d44bece3349bd88313fc114bb489c037599adf3a7d29f  icons-atlas.png
5d280cc319691e1df166f366f06f20156b6d1d873c1d803a822f0d93323b7465  nightveil-atlas.png
fa03205f885447fd87ef23fe1932a22d521832f11016f01f3072fd0a70847181  stormglass-depth-atlas.png
```

## Canvas dimensions

- The three depth atlases remain `1254 x 1254` with a `4 x 4` layout.
- The Daybreak, Nightveil, and icon atlases remain `1536 x 1024` with a `4 x 2` layout.
