#!/usr/bin/env bash
set -euo pipefail

ZOLA_VERSION=0.22.1

echo "Downloading Zola ${ZOLA_VERSION}..."
curl -sLJO "https://github.com/getzola/zola/releases/download/v${ZOLA_VERSION}/zola-v${ZOLA_VERSION}-x86_64-unknown-linux-gnu.tar.gz"

echo "Extracting Zola..."
tar -xf zola-v${ZOLA_VERSION}-x86_64-unknown-linux-gnu.tar.gz

echo "Building site with Zola..."
./zola build

echo "Build complete! Generated files:"
ls -la public/