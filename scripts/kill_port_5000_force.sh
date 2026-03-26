#!/bin/bash

# Script to forcefully kill the process using port 5000 (no confirmation)

echo "Finding process using port 5000..."

# Find the process ID using port 5000
PID=$(lsof -ti:5000)

if [ -z "$PID" ]; then
    echo "No process found using port 5000"
    exit 0
fi

echo "Found process with PID: $PID"
echo "Process details:"
lsof -i:5000

# Kill the process forcefully
echo ""
echo "Killing process $PID..."
kill -9 $PID

# Verify it's gone
sleep 1
if lsof -ti:5000 > /dev/null 2>&1; then
    echo "Warning: Port 5000 is still in use. Trying again..."
    PID=$(lsof -ti:5000)
    if [ ! -z "$PID" ]; then
        kill -9 $PID
        sleep 1
    fi
fi

if lsof -ti:5000 > /dev/null 2>&1; then
    echo "Error: Could not free port 5000"
    exit 1
else
    echo "✓ Port 5000 is now free"
    exit 0
fi
