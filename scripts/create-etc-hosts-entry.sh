#!/bin/bash

# Check if domain parameter is provided
if [ -z "$1" ]; then
    echo "Error: Domain parameter is required"
    echo "Usage: $0 <domain>"
    exit 1
fi

# Domain from command line parameter
DOM="$1"
HOST_ENTRY="127.0.0.1       $DOM"

# Check if domain is already in /etc/hosts
if ! grep -q "$DOM" /etc/hosts; then
    echo "Domain $DOM not found in /etc/hosts"
    echo "Adding entry: $HOST_ENTRY"

    # Use sudo to append the entry
    if ! sudo -v; then
        echo "Error: Failed to validate sudo access"
        exit 1
    fi

    echo "$HOST_ENTRY" | sudo tee -a /etc/hosts > /dev/null

    if [ $? -eq 0 ]; then
        echo "Successfully added domain to /etc/hosts"
    else
        echo "Error: Failed to add domain to /etc/hosts"
        exit 1
    fi
else
    echo "Domain $DOM already exists in /etc/hosts"
fi
