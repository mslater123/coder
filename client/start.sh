#!/bin/bash

# Bitcoin Miner Startup Script
# This script helps set up and start a miner on a remote machine

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}=== Bitcoin Miner Setup ===${NC}"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}.env file created${NC}"
        echo ""
        echo -e "${YELLOW}Please edit .env file with your configuration:${NC}"
        echo "  - MINER_ID: Unique identifier for this miner"
        echo "  - BACKEND_URL: Backend server URL (e.g., http://192.168.1.100:5000)"
        echo ""
        read -p "Press Enter to continue after editing .env..."
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Load environment variables
source .env

# Validate required variables
if [ -z "$MINER_ID" ]; then
    echo -e "${RED}Error: MINER_ID not set in .env${NC}"
    exit 1
fi

if [ -z "$BACKEND_URL" ]; then
    echo -e "${RED}Error: BACKEND_URL not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}Configuration:${NC}"
echo "  MINER_ID: $MINER_ID"
echo "  MINER_NAME: ${MINER_NAME:-Miner-$MINER_ID}"
echo "  BACKEND_URL: $BACKEND_URL"
echo "  MINER_PORT: ${MINER_PORT:-5001}"
echo ""

# Test backend connectivity
echo -e "${YELLOW}Testing backend connectivity...${NC}"
if curl -f -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}Backend is reachable${NC}"
else
    echo -e "${RED}Warning: Cannot reach backend at $BACKEND_URL${NC}"
    echo "  Please verify:"
    echo "    - Backend is running"
    echo "    - BACKEND_URL is correct"
    echo "    - Network connectivity"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Starting miner...${NC}"
docker-compose --env-file .env up -d

echo ""
echo -e "${GREEN}Miner started!${NC}"
echo ""
echo "View logs: docker-compose logs -f"
echo "Stop miner: docker-compose down"
echo ""
