#!/bin/bash

# Start both backend and frontend servers
# This script starts the Flask backend and Vite frontend concurrently

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}=== Starting Backend and Frontend ===${NC}"
echo ""

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down servers...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        echo -e "${YELLOW}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}Servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C and call cleanup function
trap cleanup SIGINT SIGTERM

# Start Backend
echo -e "${BLUE}Starting backend server...${NC}"
cd "$SCRIPT_DIR/backend"

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate venv and run backend in background
(
    source venv/bin/activate
    export FLASK_APP=app.py
    export FLASK_DEBUG=${FLASK_DEBUG:-False}
    export PORT=${PORT:-5000}
    
    # Install dependencies if needed
    if [ -f "requirements.txt" ]; then
        pip install -q -r requirements.txt
    fi
    
    # Create data directory if it doesn't exist
    mkdir -p data
    
    # Run the Flask application
    python app.py
) > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend is still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Error: Backend failed to start. Check /tmp/backend.log for details${NC}"
    cat /tmp/backend.log
    exit 1
fi

echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}Backend running on: http://localhost:5000${NC}"
echo ""

# Start Frontend
echo -e "${BLUE}Starting frontend server...${NC}"
cd "$SCRIPT_DIR/app"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

# Run frontend in background and capture PID
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

# Check if frontend is still running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}Error: Frontend failed to start. Check /tmp/frontend.log for details${NC}"
    cat /tmp/frontend.log
    cleanup
    exit 1
fi

echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${GREEN}Frontend running on: http://localhost:5174${NC}"
echo ""
echo -e "${GREEN}=== Both servers are running ===${NC}"
echo -e "${YELLOW}Backend logs: tail -f /tmp/backend.log${NC}"
echo -e "${YELLOW}Frontend logs: tail -f /tmp/frontend.log${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
