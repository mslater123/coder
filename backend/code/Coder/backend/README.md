# Bitcoin Tracker Backend

Python Flask backend for Bitcoin tracking and mining simulation.

## Quick Start

### Option 1: Using the Startup Script (Recommended)

**On macOS/Linux:**
```bash
./start.sh
```

**On Windows:**
```cmd
start.bat
```

The startup script will automatically:
- Check Python installation
- Create virtual environment if needed
- Install/update dependencies
- Start the Flask server

### Option 2: Using Make (macOS/Linux)

```bash
make setup    # First time setup
make run      # Run the server
make dev      # Run in development mode
```

### Option 3: Manual Setup

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the server:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## Environment Variables

You can customize the backend behavior using environment variables:

- `FLASK_APP` - Flask application entry point (default: `app.py`)
- `FLASK_DEBUG` - Enable debug mode (default: `False`)
- `DATABASE_URL` - Database connection string (default: SQLite `coder.db` in the Flask `instance` directory)
- `PORT` - Server port (default: `5000`)

Example:
```bash
export FLASK_DEBUG=True
export PORT=8080
./start.sh
```

## API Endpoints

### Legacy Endpoints (for backward compatibility)
- `GET /api/status` - Get current mining statistics
- `POST /api/start` - Start mining
- `POST /api/stop` - Stop mining
- `POST /api/difficulty` - Set mining difficulty (1-8)
- `GET /api/health` - Health check endpoint

### Mining Endpoints
- `GET /api/mining/sessions` - Get all mining sessions
- `GET /api/mining/sessions/<id>` - Get specific session
- `POST /api/mining/sessions` - Create new session
- `PUT /api/mining/sessions/<id>` - Update session
- `GET /api/mining/sessions/<id>/stats` - Get session statistics
- `POST /api/mining/sessions/<id>/stats` - Add statistics snapshot

### Price Endpoints
- `GET /api/price/latest` - Get latest Bitcoin price
- `GET /api/price/history` - Get price history
- `POST /api/price/` - Add new price record

### Wallet Endpoints
- `GET /api/wallets/` - Get all tracked wallets
- `GET /api/wallets/<address>` - Get specific wallet
- `POST /api/wallets/` - Create new wallet
- `PUT /api/wallets/<address>` - Update wallet
- `GET /api/wallets/<address>/transactions` - Get wallet transactions

### Transaction Endpoints
- `GET /api/transactions/` - Get all transactions
- `POST /api/transactions/` - Add new transaction
- `GET /api/transactions/<txid>` - Get specific transaction

## Note

This is a simplified educational implementation. Real Bitcoin mining requires specialized hardware (ASICs) and is extremely resource-intensive. This simulation demonstrates the concept but cannot mine actual Bitcoin.
