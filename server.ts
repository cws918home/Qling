import dotenv from "dotenv";
dotenv.config(); // Explicitly call config

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";
import fs from "fs";
import {
  processSimpleModerationResponse,
} from "./src/server/moderationResponses";
import { fetchFromOpenAI, moderateAndInferWorryCategories } from "./src/server/moderationProvider";
import { registerWorryRoutes } from "./src/server/worryRoutes";
import { registerReplyRoutes } from "./src/server/replyRoutes";
import { registerReadStateRoutes } from "./src/server/readStateRoutes";
import { registerPassRoutes } from "./src/server/passRoutes";
import { registerFeedbackRoutes } from "./src/server/feedbackRoutes";
import { registerRematchRoutes } from "./src/server/rematchRoutes";
import { registerAiFallbackRoutes } from "./src/server/aiFallbackRoutes";
import { registerExampleWorryRoutes } from "./src/server/exampleWorryRoutes";
import { registerUserAccountRoutes } from "./src/server/userAccountRoutes";
import { registerUserProfileRoutes } from "./src/server/userProfileRoutes";
import { registerAdminHidingRoutes } from "./src/server/adminHidingRoutes";
import { registerAnswerFeedRoutes } from "./src/server/answerFeedRoutes";

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
        content => fetchFromOpenAI(`You are a moderator for a Korean anonymous worry-sharing app.
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
    registerAnswerFeedRoutes(app, {
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
        content => fetchFromOpenAI(`You are a moderator for a Korean anonymous worry-sharing app.
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
    registerUserProfileRoutes(app, {
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
    app.get('/api/me/answer-feed', (_req, res) => {
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
    registerUserProfileRoutes(app, {
      db: null,
      auth: {} as never,
    });
    registerAdminHidingRoutes(app, {
      db: null,
    });
  }

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
