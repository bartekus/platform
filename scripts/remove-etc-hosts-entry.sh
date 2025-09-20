#!/bin/bash

# Check if domain parameter is provided
if [ -z "$1" ]; then
    echo "Error: Domain parameter is required"
    echo "Usage: $0 <domain>"
    exit 1
fi

# Domain from command line parameter
DOM="$1"

# Check if domain exists in /etc/hosts
if grep -q "$DOM" /etc/hosts; then
    echo "Domain $DOM found in /etc/hosts"
    echo "Removing entry..."

    # Use sudo to validate permissions early
    if ! sudo -v; then
        echo "Error: Failed to validate sudo access"
        exit 1
    fi

    # Create a temporary file and write filtered content
    if sudo sed -i.bak "/127\.0\.0\.1[[:space:]]*$DOM/d" /etc/hosts; then
        echo "Successfully removed domain from /etc/hosts"
    else
        echo "Error: Failed to remove domain from /etc/hosts"
        exit 1
    fi
else
    echo "Domain $DOM not found in /etc/hosts"
fi
