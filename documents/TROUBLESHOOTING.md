# Troubleshooting Guide

## CORS and 404 Errors

If you're experiencing CORS errors or 404 errors, follow these steps:

### 1. Ensure Backend is Running

The backend must be running on port 5000 before starting the frontend.

**Start the backend:**
```bash
cd backend
./start.sh
```

Or manually:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

You should see output like:
```
 * Running on http://0.0.0.0:5000
```

### 2. Verify Backend is Accessible

Test the backend health endpoint:
```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{"status": "healthy", "service": "coder-api"}
```

### 3. Check Frontend Configuration

The frontend uses Vite's proxy configuration. Make sure `vite.config.ts` has:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

### 4. Restart Both Services

1. Stop the backend (Ctrl+C)
2. Restart the backend: `./start.sh`
3. Restart the frontend dev server
4. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)

### 5. Check Port Conflicts

Make sure port 5000 is not being used by another application:
```bash
# macOS/Linux
lsof -i :5000

# Kill process if needed
kill -9 <PID>
```

### 6. Verify CORS Configuration

The backend should have CORS configured in `app.py`:
```python
CORS(app, 
     origins="*",
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
     supports_credentials=False)
```

### 7. Check Browser Console

Open browser DevTools (F12) and check:
- Network tab: Are requests being made?
- Console tab: Any JavaScript errors?
- Check if requests show CORS errors or 404 errors

### Common Issues

**Issue: "404 NOT FOUND"**
- Backend is not running
- Backend is running on a different port
- Route is not registered

**Issue: "CORS policy blocked"**
- Backend CORS not configured
- Backend not running
- Wrong origin in CORS config

**Issue: "Connection refused"**
- Backend is not running
- Backend is running on different port
- Firewall blocking connection

## Quick Fix

1. Stop all running services
2. Start backend: `cd backend && ./start.sh`
3. Wait for "Running on http://0.0.0.0:5000"
4. In a new terminal, start frontend: `cd app && npm run dev`
5. Open browser to the frontend URL
6. Hard refresh (Ctrl+Shift+R)
