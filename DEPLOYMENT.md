# Netlify Deployment Guide

## Overview

This application consists of two parts:

- **Frontend**: React + Vite SPA (CSR only) → Deploy to Netlify ✅
- **Backend**: Node.js/Express API → Deploy separately ⚠️

**Current Production Setup:**
- Backend API: `https://plastics-meters-cocktail-industrial.trycloudflare.com`
- API URL is already configured in `netlify.toml` and `.env.production`

## Frontend Deployment to Netlify

### Option 1: Deploy via Netlify UI (Recommended)

1. **Connect Repository**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository

2. **Build Settings** (auto-detected from `netlify.toml`)
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Environment Variables** (Already Configured ✅)
   - The `VITE_API_BASE_URL` is already set in `netlify.toml`
   - Current value: `https://plastics-meters-cocktail-industrial.trycloudflare.com`
   - No manual configuration needed unless you change the backend URL
   - To override: Site settings → Environment variables

4. **Deploy**
   - Click "Deploy site"
   - Your frontend will be live at `https://your-site.netlify.app`

### Option 2: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

## Backend Deployment Options

Since the backend uses:

- Express server with REST API
- Server-Sent Events (SSE) for real-time updates
- File system for data persistence
- Cheerio for web scraping

You have several deployment options:

### Option 1: Render.com (Recommended, Free Tier Available)

1. Go to [render.com](https://render.com)
2. Create a new "Web Service"
3. Connect your repository
4. Configure:
   - **Build Command**: Leave empty (Node.js app)
   - **Start Command**: `node server/index.js`
   - **Environment**: Node
   - **Plan**: Free or Starter
5. Add environment variable if needed: `PORT=5174` (optional)
6. Deploy
7. Copy the service URL and use it as `VITE_API_BASE_URL` in Netlify

**Pros**: Free tier, persistent storage, supports SSE
**Cons**: Free tier spins down after inactivity

### Option 2: Railway.app

1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Configure:
   - **Start Command**: `node server/index.js`
   - **Port**: 5174 (auto-detected)
4. Deploy
5. Get the public URL and set as `VITE_API_BASE_URL`

**Pros**: Easy setup, good performance
**Cons**: Pay-as-you-go after free trial

### Option 3: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Create fly.toml in project root
flyctl launch

# Deploy
flyctl deploy
```

**Pros**: Good free tier, edge deployment
**Cons**: Requires CLI setup

### Option 4: Netlify Functions (Requires Refactoring)

Converting the Express server to Netlify Functions would require:

- Splitting each Express route into separate serverless functions
- Replacing SSE with polling or WebSockets
- Using external database (e.g., MongoDB, Supabase) instead of JSON files
- This is NOT recommended for this app due to SSE requirements

## Complete Deployment Steps

1. **Deploy Backend First** (choose one option above)

   ```bash
   # Example for Render:
   # - Create Web Service on Render
   # - Point to server/index.js
   # - Get URL: https://hjulet-api.onrender.com
   ```

2. **Configure Frontend for Backend**
   - In Netlify UI: Site settings → Environment variables
   - Add: `VITE_API_BASE_URL` = `https://hjulet-api.onrender.com`

3. **Deploy Frontend to Netlify**
   - Push code with `netlify.toml` to GitHub
   - Netlify auto-deploys on push
   - Or use Netlify UI to trigger deploy

4. **Test Everything**
   - Visit your Netlify URL: `https://your-site.netlify.app`
   - Check admin page works: `/admin`
   - Check player page works: `/join`
   - Verify real-time updates work

## Environment Variables Summary

### Netlify (Frontend)

```
VITE_API_BASE_URL=https://your-backend-url.com
```

### Backend Service (Render/Railway/Fly.io)

```
PORT=5174  # Usually auto-set
NODE_ENV=production  # Optional
```

## Troubleshooting

### CORS Issues

If you get CORS errors, ensure your backend has proper CORS configuration:

- The backend already has `cors()` middleware enabled
- Should work automatically

### SSE Connection Issues

- Make sure backend service doesn't time out long connections
- Render free tier should support SSE
- Check backend logs for connection errors

### SPA Routing (404 on refresh)

- `netlify.toml` and `public/_redirects` already configured
- All routes redirect to `index.html` for client-side routing

### Build Failures

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## Cost Estimate

**Free Tier Setup:**

- Netlify (Frontend): Free
- Render (Backend): Free (with sleep on inactivity)
- Total: $0/month

**Production Setup:**

- Netlify Pro: $19/month (optional)
- Render Starter: $7/month (persistent, no sleep)
- Total: $7-26/month

## Alternative: Docker Deployment

If you want to keep frontend + backend together:

- Deploy the included `docker-compose.yml` to any Docker host
- Use services like Railway, Render, or DigitalOcean App Platform
- Not suitable for Netlify
