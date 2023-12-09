#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

set -a; source "$HERE/../.env.development"; set +a
yarn zapatos
