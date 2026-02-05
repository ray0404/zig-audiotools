#!/bin/bash

# Jules Environment Startup Script for ZigAudioTools
# This script sets up Zig 0.13.0 and project dependencies.

set -e

ZIG_VERSION="0.13.0"
# Jules environments are typically linux x86_64
ZIG_URL="https://ziglang.org/download/${ZIG_VERSION}/zig-linux-x86_64-${ZIG_VERSION}.tar.xz"
INSTALL_DIR="$HOME/.local/bin"
ZIG_PATH="$INSTALL_DIR/zig-linux-x86_64-${ZIG_VERSION}"

echo "--- Jules Environment Setup Started ---"

# 1. Ensure local bin directory exists
mkdir -p "$INSTALL_DIR"

# 2. Install Zig 0.13.0 if not already present
if [[ ! -d "$ZIG_PATH" ]]; then
    echo "Downloading Zig ${ZIG_VERSION}..."
    curl -L "$ZIG_URL" | tar -xJ -C "$INSTALL_DIR"
    echo "Zig ${ZIG_VERSION} installed to $ZIG_PATH"
else
    echo "Zig ${ZIG_VERSION} already exists at $ZIG_PATH"
fi

# 3. Update PATH
export PATH="$ZIG_PATH:$PATH"
echo "Updated PATH with Zig: $(which zig)"
zig version

# 4. Install Node.js dependencies
echo "Installing project dependencies..."
npm install

# 5. Build WASM DSP to verify environment
echo "Verifying Zig/WASM build..."
npm run build:wasm

echo "--- Jules Environment Setup Complete ---"
echo "Note: Ensure Zig is in your path for subsequent commands: export PATH="$ZIG_PATH:\$PATH""
