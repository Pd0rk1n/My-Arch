#!/bin/bash

# Check if a package list was passed
if [[ -z "$1" ]]; then
    echo "Usage: $0 <package-list.txt>"
    exit 1
fi

PACKAGE_FILE="$1"

# Verify the package file exists
if [[ ! -f "$PACKAGE_FILE" ]]; then
    echo "Error: '$PACKAGE_FILE' does not exist."
    exit 1
fi

echo "==> Updating package database..."
sudo pacman -Sy --noconfirm

echo "==> Installing packages from $PACKAGE_FILE..."

while IFS= read -r pkg || [[ -n "$pkg" ]]; do
    # Skip empty lines and comments
    [[ -z "$pkg" || "$pkg" =~ ^# ]] && continue

    echo ">> Installing: $pkg"
    sudo pacman -S --needed --noconfirm "$pkg"

    if [[ $? -ne 0 ]]; then
        echo "!! Failed to install: $pkg"
    fi
done < "$PACKAGE_FILE"

echo "==> All done."
