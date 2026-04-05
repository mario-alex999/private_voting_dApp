#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

shopt -s nullglob
CIRCUIT_FILES=("${ROOT_DIR}"/circuits/*.nr)

if [ "${#CIRCUIT_FILES[@]}" -eq 0 ]; then
  echo "No Noir circuits found under ${ROOT_DIR}/circuits"
  exit 1
fi

for circuit_file in "${CIRCUIT_FILES[@]}"; do
  circuit_name="$(basename "${circuit_file}" .nr)"
  echo "Checking Noir circuit: ${circuit_name}"

  (
    cd "${TMP_DIR}"
    nargo new --bin "${circuit_name}" >/dev/null 2>&1
  )

  cp "${circuit_file}" "${TMP_DIR}/${circuit_name}/src/main.nr"

  (
    cd "${TMP_DIR}/${circuit_name}"
    nargo check
  )

done

echo "All Noir circuits compiled successfully."
