#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

yarn next start
