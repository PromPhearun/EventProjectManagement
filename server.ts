import express from "express";
import path from "path";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import dotenv from "dotenv";
import * as admin from "firebase-admin";

dotenv.config();

const app = express();
export default app; // Export for Vercel
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// ClickUp In-Memory Store (Fallback for when Firebase is not available)
const clickupUpdates: any[] = [];
const MAX_UPDATES = 20;

// ClickUp Webhook Endpoint (Moved to /api/webhook)
app.post("/api/webhook", async (req, res) => {
  console.log("--- ClickUp Webhook Received ---");
  
  const payload = req.body;
  
  // Use payload from ClickUp webhook if available, otherwise fallback to root body
  const taskData = payload.payload || payload;
  
  const taskId = taskData.id || payload.task_id;
  const taskName = taskData.name || "Unknown Task";
  const event = payload.event || "taskUpdated";
  const assignees = taskData.assignees ? taskData.assignees.map((a: any) => a.username).join(', ') : 'No Assignee';
  const creator = taskData.creator ? taskData.creator.username : 'Unknown Creator';

  console.log(`Event: ${event}`);
  console.log(`Task ID: ${taskId}`);
  console.log(`Task Name: ${taskName}`);
  console.log(`Assignee: ${assignees}`);
  console.log(`Creator: ${creator}`);
  console.log('--------------------------------');
  
  const update = {
    id: Math.random().toString(36).substring(7),
    taskId,
    taskName,
    event,
    assignees, // Added for potential future UI use
    creator,   // Added for potential future UI use
    history: payload.history_items || [],
    fullPayload: payload,
    timestamp: new Date().toISOString()
  };

  // Add to local store for the frontend feed
  clickupUpdates.unshift(update);
  if (clickupUpdates.length > MAX_UPDATES) {
    clickupUpdates.pop();
  }

  res.status(200).json({ status: "received" });
});

// Endpoint for frontend to fetch ClickUp updates
app.get("/api/clickup/updates", (req, res) => {
  res.json(clickupUpdates);
});

app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'epm-secret-key'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === "production",
  sameSite: 'none'
}));

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
);

// Auth Routes
app.get("/api/auth/google/url", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.email"],
    prompt: "consent"
  });
  res.json({ url });
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    req.session!.tokens = tokens;
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error getting tokens", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/api/auth/google/status", (req, res) => {
  res.json({ connected: !!req.session?.tokens });
});

app.post("/api/auth/google/logout", (req, res) => {
  req.session = null;
  res.json({ status: "ok" });
});

// Gmail Sending Route
app.post("/api/gmail/send", async (req, res) => {
  if (!req.session?.tokens) {
    return res.status(401).json({ error: "Not connected to Google" });
  }

  const { to, subject, body } = req.body;
  oauth2Client.setCredentials(req.session.tokens);
  
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    body,
  ];
  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });
    res.json({ status: "sent" });
  } catch (error) {
    console.error("Gmail send error:", error);
    res.status(500).json({ error: (error as any).message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if not in a serverless environment (Vercel)
  if (process.env.VERCEL !== '1') {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
