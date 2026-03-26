#!/bin/bash

# Script to kill the process using port 5000

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

# Kill the process
echo ""
read -p "Kill this process? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    kill -9 $PID
    echo "Process $PID killed successfully"
    
    # Verify it's gone
    sleep 1
    if lsof -ti:5000 > /dev/null 2>&1; then
        echo "Warning: Port 5000 is still in use"
    else
        echo "Port 5000 is now free"
    fi
else
    echo "Cancelled"
fi
