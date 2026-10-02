#!/usr/bin/env bash
# Despliega la página al bucket S3 "sqlite.rs1.es".
# Se suben solamente los archivos necesarios para que funcione la página.
set -euo pipefail

BUCKET='s3://sqlite.rs1.es/'

# Archivos esenciales: si falta alguno, aborta el despliegue
FILES=(
  index.html
  app.js
  apple-touch-icon.png
  favicon.png
  favicon.svg
  favicon.ico
  styles.css
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

echo "Subiendo archivos a $BUCKET ..."
# La whitelist (exclude * + include) garantiza que no se sube nada que
# la página no utilice (README, sitemap.xml, .git, etc.)
# aws s3 rm "$BUCKET" --recursive
aws s3 sync . "$BUCKET" \
  --exclude '*' \
  $(printf '  --include %q' "${FILES[@]}")

echo "Despliegue completado."
