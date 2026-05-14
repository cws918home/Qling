import dotenv from "dotenv";
dotenv.config(); // Explicitly call config

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import {
  processSimpleModerationResponse,
  processWorryModerationResponse,
} from "./src/server/moderationResponses";
import { moderateAndInferWorryCategories } from "./src/server/moderationProvider";
import { registerWorryRoutes } from "./src/server/worryRoutes";
import { registerReplyRoutes } from "./src/server/replyRoutes";
import { registerReadStateRoutes } from "./src/server/readStateRoutes";
import { registerPassRoutes } from "./src/server/passRoutes";
import { registerFeedbackRoutes } from "./src/server/feedbackRoutes";
import { registerRematchRoutes } from "./src/server/rematchRoutes";
import { registerAiFallbackRoutes } from "./src/server/aiFallbackRoutes";
import { registerExampleWorryRoutes } from "./src/server/exampleWorryRoutes";
import { registerLegacyNotificationRoutes } from "./src/server/legacyNotificationRoutes";
import { registerUserAccountRoutes } from "./src/server/userAccountRoutes";
import { registerAdminHidingRoutes } from "./src/server/adminHidingRoutes";

// Read client config to get database ID
const clientConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firestoreDatabaseId = '(default)';
if (fs.existsSync(clientConfigPath)) {
  try {
    const clientConfig = JSON.parse(fs.readFileSync(clientConfigPath, 'utf-8'));
    firestoreDatabaseId = clientConfig.firestoreDatabaseId || '(default)';
    console.log(`Using Firestore Database ID: ${firestoreDatabaseId}`);
  } catch (err) {
    console.error("Failed to read client config for database ID", err);
  }
}

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (getApps().length === 0) {
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log("Firebase Admin initialized successfully.");
    }
  } catch (err) {
    console.error("Firebase Admin initialization failed:", err);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT not found in environment variables.");
}

const db = getApps().length > 0 ? getFirestore(firestoreDatabaseId) : null;
const messaging = getApps().length > 0 ? getMessaging() : null;

async function fetchFromOpenRouter(systemInstruction: string, userContent: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error("CRITICAL ERROR: OPENROUTER_API_KEY is missing!");
    throw new Error("OPENROUTER_API_KEY is not defined in .env file");
  }

  console.log(`Attempting to call OpenAI with model: gpt-5.4-mini`);
 
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userContent }
      ],
      temperature: 0.1,
      max_completion_tokens: 1000
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`OpenRouter API Error Status: ${response.status}`);
    console.error(`OpenRouter API Error Body: ${errText}`);
    throw new Error(`OpenRouter API Error: ${response.status}`);
  }

  const data = await response.json();
  console.log("Successfully received response from OpenRouter.");
  
  let textContent = data.choices?.[0]?.message?.content || "{}";
  
  // Sometimes models wrap JSON in code blocks like ```json ... ```
  if (textContent.includes("```")) {
    textContent = textContent.replace(/```json|```/g, "").trim();
  }
  
  try {
    return JSON.parse(textContent);
  } catch (parseError) {
    console.error("JSON Parse Error. Raw content:", textContent);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  if (getApps().length > 0) {
    registerWorryRoutes(app, {
      db,
      messaging,
      auth: getAuth(),
      moderationProvider: moderateAndInferWorryCategories,
    });
    registerReplyRoutes(app, {
      db,
      messaging,
      auth: getAuth(),
      moderationProvider: replyContent => processSimpleModerationResponse(
        replyContent,
        content => fetchFromOpenRouter(`You are a moderator for a Korean anonymous worry-sharing app.
1. Check if the reply is inappropriate, abusive, violent, or unhelpful spam.
2. Return JSON exactly like this:
   - If bad: { "status": "rejected", "reason": "부적절한 표현이 감지되었습니다." }
   - If good: { "status": "approved" }`, content)
      ).then(result => result.body),
    });
    registerReadStateRoutes(app, {
      db,
      auth: getAuth(),
    });
    registerPassRoutes(app, {
      db,
      messaging,
      auth: getAuth(),
    });
    registerFeedbackRoutes(app, {
      db,
      messaging,
      auth: getAuth(),
      moderationProvider: commentContent => processSimpleModerationResponse(
        commentContent,
        content => fetchFromOpenRouter(`You are a moderator for a Korean anonymous worry-sharing app.
1. Check if the feedback comment is inappropriate, abusive, violent, or spam.
2. Return JSON exactly like this:
   - If bad: { "status": "rejected", "reason": "부적절한 표현이 감지되었습니다." }
   - If good: { "status": "approved" }`, content)
      ).then(result => result.body),
    });
    registerRematchRoutes(app, {
      db,
      messaging,
    });
    registerAiFallbackRoutes(app, {
      db,
      messaging,
    });
    registerExampleWorryRoutes(app, {
      db,
      auth: getAuth(),
    });
    registerUserAccountRoutes(app, {
      db,
      auth: getAuth(),
    });
    registerAdminHidingRoutes(app, {
      db,
    });
  } else {
    app.post('/api/worries/publish', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    app.post('/api/deliveries/:deliveryId/replies', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    app.post('/api/deliveries/:deliveryId/read', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    app.post('/api/deliveries/:deliveryId/pass', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    app.post('/api/worries/:worryId/replies/read', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    app.post('/api/replies/:replyId/feedback', (_req, res) => {
      res.status(500).json({
        error: {
          code: 'firebase_unavailable',
          message: 'Firebase Admin is not initialized.',
        },
      });
    });
    registerRematchRoutes(app, {
      db: null,
      messaging: null,
    });
    registerAiFallbackRoutes(app, {
      db: null,
      messaging: null,
    });
    registerExampleWorryRoutes(app, {
      db: null,
      auth: {} as never,
    });
    registerUserAccountRoutes(app, {
      db: null,
      auth: {} as never,
    });
    registerAdminHidingRoutes(app, {
      db: null,
    });
  }

  // API Route for Processing Worries (Filtering + Category Inference)
  app.post("/api/process-worry", async (req, res) => {
    try {
      const result = await processWorryModerationResponse(
        req.body?.content,
        moderateAndInferWorryCategories
      );
      res.status(result.statusCode).json(result.body);
    } catch (error: any) {
      console.error("Worry processing backend/system exception:", error?.message || error);
      res.status(502).json({ error: "Worry moderation provider failure" });
    }
  });

  // API Route for generating an AI reply (for bots)
  app.post("/api/generate-ai-reply", async (req, res) => {
    try {
      const { worryContent, botInfo } = req.body;
      const systemInstruction = `You are a warm, empathetic person who just received an anonymous worry. 
Your persona: ${botInfo.gender === 'female' ? 'A kind sister/older woman' : 'A supportive brother/older man'}. 
Interests: ${botInfo.interests.join(', ')}.
Task: Write a comforting, personal reply to the worry. Keep it between 2-4 sentences. Use a warm, polite Korean tone (해요체). 
Do NOT use professional counselor jargon. Sound like a real person.
Return JSON: { "content": "Your reply here" }`;

      const resultObj = await fetchFromOpenRouter(systemInstruction, worryContent);
      res.json(resultObj);
    } catch (error: any) {
      console.error("AI Reply Generation Error:", error?.message || error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // API Route for Processing Replies (Filtering only)
  app.post("/api/process-reply", async (req, res) => {
    try {
      const { content } = req.body;

      const systemInstruction = `You are a moderator for a Korean anonymous worry-sharing app.
1. Check if the reply is inappropriate, abusive, violent, or unhelpful spam.
2. Return JSON exactly like this:
   - If bad: { "status": "rejected", "reason": "부적절한 표현이 감지되었습니다." }
   - If good: { "status": "approved" }`;

      const result = await processSimpleModerationResponse(content, replyContent =>
        fetchFromOpenRouter(systemInstruction, replyContent)
      );
      res.status(result.statusCode).json(result.body);
    } catch (error: any) {
      console.error("Reply Filter Error:", error?.message || error);
      res.status(502).json({ error: "Reply moderation provider failure" });
    }
  });

  // API Route for Processing Comments (Filtering only)
  app.post("/api/process-comment", async (req, res) => {
    try {
      const { content } = req.body;

      const systemInstruction = `You are a moderator for a Korean anonymous worry-sharing app.
1. Check if the comment left by the publisher is inappropriate, abusive, violent, or spam.
2. Return JSON exactly like this:
   - If bad: { "status": "rejected", "reason": "부적절한 표현이 감지되었습니다." }
   - If good: { "status": "approved" }`;

      const result = await processSimpleModerationResponse(content, commentContent =>
        fetchFromOpenRouter(systemInstruction, commentContent)
      );
      res.status(result.statusCode).json(result.body);
    } catch (error: any) {
      console.error("Comment Filter Error:", error?.message || error);
      res.status(502).json({ error: "Comment moderation provider failure" });
    }
  });

  registerLegacyNotificationRoutes(app);

  app.post("/api/schedule-bot-reply", async (req, res) => {
    const { worryId, worryContent, receiverId, botInfo } = req.body;
    
    // Send immediate response to client
    res.json({ status: "scheduled" });

    // Calculate a random delay between 4 and 8 minutes
    const minMinutes = 4;
    const maxMinutes = 8;
    const delayMs = (Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes) * 60 * 1000;
    
    console.log(`[Bot] Scheduling reply from ${botInfo.uid} in ${delayMs / 1000 / 60} minutes.`);

    setTimeout(async () => {
      if (!db) return;
      try {
        console.log(`[Bot] Generating delayed reply for ${receiverId}...`);
        
        const systemInstruction = `You are a warm, empathetic person who just received an anonymous worry. 
Your persona: ${botInfo.gender === 'female' ? 'A kind sister/older woman' : 'A supportive brother/older man'}. 
Interests: ${botInfo.interests.join(', ')}.
Task: Write a comforting, personal reply to the worry. Keep it between 2-4 sentences. Use a warm, polite Korean tone (해요체). 
Do NOT use professional counselor jargon. Sound like a real person.
Return JSON: { "content": "Your reply here" }`;

        const resultObj = await fetchFromOpenRouter(systemInstruction, worryContent);
        const replyText = resultObj?.content || "당신의 고민을 잘 읽었어요. 마음이 따뜻해지는 밤 되시길 바랄게요.";

        // Save reply to Firestore
        await db.collection('letters').add({
          senderId: botInfo.uid,
          receiverId: receiverId,
          originalContent: replyText,
          refinedContent: replyText,
          type: 'reply',
          replyTo: worryId,
          replyToContent: worryContent,
          createdAt: FieldValue.serverTimestamp(),
          isRead: false,
          feedback: null
        });

        console.log(`[Bot] Delayed reply from ${botInfo.uid} saved.`);

        console.log(`[Bot] Legacy delayed reply notification skipped; PRD notifications are sent by server-owned reply flows.`);
      } catch (err) {
        console.error(`[Bot] Delayed reply failed for ${botInfo.uid}:`, err);
      }
    }, delayMs);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    
    // Serve static files with correct MIME types for PWA
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.webmanifest')) {
          res.setHeader('Content-Type', 'application/manifest+json');
        }
        if (filePath.endsWith('sw.js')) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Service-Worker-Allowed', '/');
        }
      }
    }));
    
    // Always serve index.html for SPA routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
