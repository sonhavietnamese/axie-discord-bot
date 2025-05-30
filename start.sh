#!/bin/bash

usage() {
    echo "Usage: $0 <bot_name>"
    echo "Example: $0 chimera"
    echo "Example: $0 fishing"
    exit 1
}

if [ $# -eq 0 ]; then
    echo "Error: Bot name is required"
    usage
fi

if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    usage
fi

BOT_NAME="$1"

if [ ! -d "$BOT_NAME" ]; then
    echo "Error: Directory '$BOT_NAME' does not exist"
    exit 1
fi

echo "Starting $BOT_NAME bot..."
cd "$BOT_NAME" || exit 1

if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in $BOT_NAME directory"
    exit 1
fi

echo "Running 'bun dev' in $BOT_NAME directory..."
bun dev
