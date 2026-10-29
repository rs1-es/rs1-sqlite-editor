#!/usr/bin/env bash
# Despliega la página al bucket S3 "sqlite.rs1.es".
# Se suben solamente los archivos necesarios para que funcione la página.
#
# Caché: styles.min.css y app.min.js (los que cambian con la aplicación) se
# referencian en index.html con ?v=<hash> y se sirven con caché de un año.
# index.html no lleva cabecera de caché (Cloudflare no cachea HTML por defecto).
# El hash se aplica sobre una copia temporal: el código fuente no se modifica.
# El resto de archivos se sube como antes.
set -euo pipefail

BUCKET='s3://sqlite.rs1.es/'

# Archivos esenciales: si falta alguno, aborta el despliegue
FILES=(
  index.html
  app.js
  app.min.js
  apple-touch-icon.png
  favicon.png
  favicon.svg
  favicon.ico
  styles.css
  styles.min.css
  lib/sql-wasm.js
  lib/sql-wasm.wasm
)

echo "Comprobando archivos necesarios..."
for f in "${FILES[@]}"; do
  if [[ ! -f $f ]]; then
    echo "ERROR: Falta el archivo necesario '$f'. Despliegue cancelado." >&2
    exit 1
  fi
done


if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: El comando 'aws' (AWS CLI) no está disponible." >&2
  exit 1
fi

# Copia temporal con las referencias versionadas
DIST=$(mktemp -d)
trap 'rm -rf "$DIST"' EXIT
cp index.html styles.min.css app.min.js "$DIST/"
for f in styles.min.css app.min.js; do
  h=$(sha256sum "$f" | cut -c1-10)
  grep -q "\"$f\"" "$DIST/index.html" || {
    echo "ERROR: index.html no referencia '$f'." >&2
    exit 1
  }
  sed -i "s|\"$f\"|\"$f?v=$h\"|" "$DIST/index.html"
  echo "  $f -> ?v=$h"
done

echo "Subiendo archivos a $BUCKET ..."
# La whitelist (exclude * + include) garantiza que no se sube nada que
# la página no utilice (README, sitemap.xml, .git, etc.)
# aws s3 rm "$BUCKET" --recursive
# Primero los archivos versionados, y al final index.html, que los referencia
aws s3 cp "$DIST/styles.min.css" "${BUCKET}styles.min.css" \
  --cache-control 'public, max-age=31536000, immutable'
aws s3 cp "$DIST/app.min.js" "${BUCKET}app.min.js" \
  --cache-control 'public, max-age=31536000, immutable'

aws s3 sync . "$BUCKET" \
  --exclude '*' \
  $(printf '  --include %q' "${FILES[@]}") \
  --exclude index.html --exclude styles.min.css --exclude app.min.js

aws s3 cp "$DIST/index.html" "${BUCKET}index.html"

echo "Despliegue completado."
