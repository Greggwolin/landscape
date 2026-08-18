#!/bin/bash
export PATH="/usr/local/bin:$PATH"
# Resolve the repo root from this script own location, so the helper starts
# whichever copy of the project it is sitting in. Previously this used an
# absolute home-folder path, which meant running it from another copy of the
# repo silently started the home-folder copy instead.
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)" || exit 1
exec npm run dev
