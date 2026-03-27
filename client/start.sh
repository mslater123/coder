#!/bin/bash

# Coder GPU client — start the agent on a machine with GPUs (Docker).

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${GREEN}=== Coder GPU client ===${NC}"
echo ""

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}.env created${NC}"
        echo ""
        echo -e "${YELLOW}Edit .env with:${NC}"
        echo "  - CLIENT_ID: unique name for this machine"
        echo "  - BACKEND_URL: e.g. http://192.168.1.100:5000"
        echo ""
        read -p "Press Enter after editing .env..."
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

set -a
source .env
set +a

if [ -z "${CLIENT_ID:-}" ]; then
    echo -e "${RED}Error: CLIENT_ID not set in .env${NC}"
    exit 1
fi

if [ -z "${BACKEND_URL:-}" ]; then
    echo -e "${RED}Error: BACKEND_URL not set in .env${NC}"
    exit 1
fi

echo -e "${GREEN}Configuration:${NC}"
echo "  CLIENT_ID: $CLIENT_ID"
echo "  BACKEND_URL: $BACKEND_URL"
echo ""

echo -e "${YELLOW}Testing backend...${NC}"
if curl -f -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}Backend is reachable${NC}"
else
    echo -e "${RED}Warning: cannot reach $BACKEND_URL${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}Starting GPU client (docker compose)...${NC}"
docker compose --env-file .env up -d

echo ""
echo -e "${GREEN}Client started.${NC}"
echo "Logs: docker compose logs -f"
echo "Stop: docker compose down"
echo ""
