# Ngrok Setup Guide - Share Your FaithGuard App Temporarily

This guide will help you share your local FaithGuard development server with your friend using ngrok.

## Step 1: Install Ngrok

If ngrok is not installed, you have two options:

### Option A: Download Ngrok (Recommended)
1. Go to https://ngrok.com/download
2. Download ngrok for Windows
3. Extract the `ngrok.exe` file
4. Add it to your PATH or place it in a folder you can access

### Option B: Use npm (if you have Node.js)
```bash
npm install -g ngrok
```

## Step 2: Sign Up for Free Ngrok Account (Optional but Recommended)
1. Go to https://dashboard.ngrok.com/signup
2. Create a free account
3. Get your authtoken from the dashboard
4. Run: `ngrok config add-authtoken YOUR_AUTH_TOKEN`

This gives you:
- Longer session times
- Custom subdomains (optional)
- Better performance

## Step 3: Start Your Dev Server

Make sure your Vite dev server is running:
```bash
npm run dev
```

Your server should be running on `http://localhost:3000`

## Step 4: Start Ngrok Tunnel

In a **new terminal window**, run:
```bash
ngrok http 3000
```

Or if ngrok is not in your PATH:
```bash
path\to\ngrok.exe http 3000
```

## Step 5: Share the URL

Ngrok will display something like:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
```

**Share the `https://` URL with your friend!**

## Important Notes:

1. **The URL changes each time** you restart ngrok (unless you have a paid plan)
2. **Keep both terminals open**: 
   - One for `npm run dev` (your server)
   - One for `ngrok http 3000` (the tunnel)
3. **The tunnel stops** when you close the ngrok terminal
4. **Free tier limitations**:
   - Session timeout after inactivity
   - Random subdomain each time
   - May have connection limits

## Troubleshooting:

- **Port already in use**: Make sure nothing else is using port 3000
- **Connection refused**: Ensure `npm run dev` is running first
- **ngrok not found**: Add ngrok to your system PATH or use full path

## Alternative: Quick Share Without Installation

If you don't want to install ngrok, you can use online alternatives:
- **localtunnel**: `npx localtunnel --port 3000`
- **serveo**: `ssh -R 80:localhost:3000 serveo.net`
