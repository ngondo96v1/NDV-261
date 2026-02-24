
import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { UserModel, LoanModel, NotificationModel, SystemSettingsModel, LogModel } from "./models";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ngondo96:119011Ngon@ndv261.n9yuhgn.mongodb.net/ndv261?retryWrites=true&w=majority";

let lastDbError: string | null = null;

async function connectDB() {
  console.log("Attempting to connect to MongoDB...");
  lastDbError = null;
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB successfully");
    
    const settings = await SystemSettingsModel.findOne();
    if (!settings) {
      await SystemSettingsModel.create({ budget: 30000000, rankProfit: 0 });
      console.log("Initialized system settings");
    }
  } catch (err: any) {
    lastDbError = err.message || String(err);
    console.error("MongoDB connection error details:", err);
  }
}

async function startServer() {
  connectDB().catch(err => {
    lastDbError = err.message || String(err);
    console.error("Background DB connection error:", err);
  });
  
  const app = express();
  const PORT = 3000;

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Health check
  app.get("/health", (req, res) => {
    const dbState = mongoose.connection.readyState;
    const states = ["Disconnected", "Connected", "Connecting", "Disconnecting"];
    res.json({ 
      status: "OK", 
      database: states[dbState] || "Unknown",
      dbCode: dbState,
      error: dbState !== 1 ? lastDbError : null,
      env: process.env.NODE_ENV || 'development'
    });
  });

  // API Routes
  app.get("/api/data", async (req, res) => {
    try {
      const [users, loans, notifications, settings] = await Promise.all([
        UserModel.find().lean(),
        LoanModel.find().sort({ updatedAt: -1 }).lean(),
        NotificationModel.find().sort({ time: -1 }).limit(200).lean(),
        SystemSettingsModel.findOne().lean()
      ]);

      res.json({
        users: users.map((u: any) => ({ ...u, id: u.id || u._id.toString() })),
        loans: loans.map((l: any) => ({ ...l, id: l.id || l._id.toString() })),
        notifications: notifications.map((n: any) => ({ ...n, id: n.id || n._id.toString() })),
        budget: settings?.budget ?? 30000000,
        rankProfit: settings?.rankProfit ?? 0
      });
    } catch (e) {
      console.error("Lỗi trong /api/data:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const incomingUsers = req.body;
      if (!Array.isArray(incomingUsers)) {
        return res.status(400).json({ error: "Expected an array of users" });
      }

      for (const u of incomingUsers) {
        const { id, ...userData } = u;
        // Try to find by custom id or phone
        if (id) {
          await UserModel.findOneAndUpdate(
            { $or: [{ id: id }, { phone: userData.phone }] },
            { ...userData, id: id, updatedAt: Date.now() },
            { upsert: true }
          );
        } else {
          await UserModel.findOneAndUpdate(
            { phone: userData.phone },
            { ...userData, updatedAt: Date.now() },
            { upsert: true }
          );
        }
      }
      
      res.json({ success: true });
    } catch (e) {
      console.error("Lỗi trong POST /api/users:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/loans", async (req, res) => {
    try {
      const incomingLoans = req.body;
      if (!Array.isArray(incomingLoans)) {
        return res.status(400).json({ error: "Expected an array of loans" });
      }

      for (const l of incomingLoans) {
        const { id, ...loanData } = l;
        await LoanModel.findOneAndUpdate(
          { id: id },
          { ...loanData, id: id, updatedAt: Date.now() },
          { upsert: true }
        );
      }
      
      res.json({ success: true });
    } catch (e) {
      console.error("Lỗi trong POST /api/loans:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const incomingNotifs = req.body;
      if (!Array.isArray(incomingNotifs)) {
        return res.status(400).json({ error: "Expected an array of notifications" });
      }

      for (const n of incomingNotifs) {
        const { id, ...notifData } = n;
        await NotificationModel.findOneAndUpdate(
          { id: id },
          { ...notifData },
          { upsert: true }
        );
      }
      
      res.json({ success: true });
    } catch (e) {
      console.error("Lỗi trong POST /api/notifications:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/budget", async (req, res) => {
    try {
      await SystemSettingsModel.findOneAndUpdate({}, { budget: req.body.budget }, { upsert: true });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/rankProfit", async (req, res) => {
    try {
      await SystemSettingsModel.findOneAndUpdate({}, { rankProfit: req.body.rankProfit }, { upsert: true });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      await Promise.all([
        UserModel.findByIdAndDelete(userId),
        LoanModel.deleteMany({ userId }),
        NotificationModel.deleteMany({ userId })
      ]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Admin Logs API
  app.get("/api/logs", async (req, res) => {
    try {
      const logs = await LogModel.find().sort({ time: -1 }).limit(100).lean();
      res.json(logs.map((l: any) => ({ ...l, id: l.id || l._id.toString() })));
    } catch (e) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/logs", async (req, res) => {
    try {
      console.log("Ghi log:", req.body.action, "bởi", req.body.user);
      await LogModel.create(req.body);
      res.json({ success: true });
    } catch (e) {
      console.error("Lỗi khi ghi log vào DB:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  const distPath = path.join(process.cwd(), "dist");
  const useVite = process.env.NODE_ENV !== "production" || !fs.existsSync(distPath);

  if (useVite) {
    console.log("Using Vite middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static files from dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
