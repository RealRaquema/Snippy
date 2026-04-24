# Deployment Setup Guide

## Architecture
- **Backend**: Deployed on Render (Node.js/Express)
- **Frontend**: Deployed on Vercel (React/Vite)
- Both services communicate via API and WebSocket

## Render Backend Setup

### 1. Render Dashboard Configuration
- Service Type: `Web Service`
- Docker: Build from `server/Dockerfile`
- Environment Variables to set:
  ```
  MONGO_URL=<your_mongodb_connection_string>
  PORT=5000
  ```

### 2. Expected Output
- Service URL: `https://snippy-server.onrender.com` (or your custom Render URL)
- CORS & WebSocket already configured to accept Vercel origins

## Vercel Frontend Setup

### 1. Vercel Dashboard Configuration
- Select the repository: Your GitHub repo
- Framework Preset: `Vite`
- Build Command: `cd client && npm install && npm run build`
- Output Directory: `client/dist`

### 2. **CRITICAL**: Environment Variables
You MUST set this in Vercel dashboard:

```
VITE_API_URL=https://snippy-server.onrender.com
```

Replace `snippy-server.onrender.com` with your actual Render service URL.

To find your Render URL:
1. Go to Render Dashboard → Your Service
2. Copy the service URL from the "Overview" tab
3. Use that URL in Vercel's `VITE_API_URL` variable

### 3. Deploy
- Push to GitHub main branch
- Vercel auto-deploys with the environment variables

## Local Development

### Start Server (port 5000)
```bash
cd server
npm install
npm start
```

### Start Client (port 5173)
```bash
cd client
npm install
npm run dev
```

The client `.env` file is already configured for `http://localhost:5000`

## Troubleshooting 404 Errors

If you see "Failed to load resource: 404" errors:

1. **Check Vercel Environment Variable**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Verify `VITE_API_URL` is set to your Render service URL
   - Redeploy after changing variables

2. **Verify Render Service is Running**
   - Check Render Dashboard → Service logs
   - Should see "Server running on port 5000"

3. **Check CORS (Server-side)**
   - Server already allows `*.vercel.app` domains
   - If using custom domain, update CORS in `server/index.js`

4. **Browser DevTools**
   - Open Network tab (F12)
   - Check the failing request URL
   - Should start with your Render URL, not localhost

## Files Modified for Separate Deployment
- `vercel.json` - Build configuration for Vercel
- `client/.env` - Local development only
- `server/index.js` - CORS already supports Vercel
