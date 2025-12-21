#!/bin/bash

set -euo pipefail

yarn search:rebuild
yarn next dev --webpack
