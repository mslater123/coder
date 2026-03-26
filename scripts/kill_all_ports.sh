#!/bin/bash

# Free dev ports: backend (Flask, 5000) and frontend (Vite, 5173).

PORTS=(5000 5173)

echo "Checking ports: ${PORTS[*]}"

FOUND=0
for port in "${PORTS[@]}"; do
  if lsof -ti:"$port" >/dev/null 2>&1; then
    FOUND=1
    echo ""
    echo "--- Port ${port} ---"
    lsof -i:"$port"
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "No processes found on ports ${PORTS[*]}"
  exit 0
fi

PIDS=$(for port in "${PORTS[@]}"; do lsof -ti:"$port" 2>/dev/null; done | sort -u | tr '\n' ' ')

echo ""
echo "PIDs to kill: ${PIDS}"
read -p "Kill these processes? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  for pid in $PIDS; do
    kill -9 "$pid" 2>/dev/null && echo "Killed PID $pid"
  done

  sleep 1
  STILL_BUSY=0
  for port in "${PORTS[@]}"; do
    if lsof -ti:"$port" >/dev/null 2>&1; then
      echo "Warning: Port $port is still in use"
      STILL_BUSY=1
    fi
  done
  if [ "$STILL_BUSY" -eq 0 ]; then
    echo "Ports ${PORTS[*]} are now free"
  fi
else
  echo "Cancelled"
fi
