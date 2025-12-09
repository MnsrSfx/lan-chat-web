import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { compare, generateToken, authMiddleware, type AuthenticatedRequest } from "./auth";
import { registerSchema, loginSchema, updateProfileSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { initializeWebSocket } from "./websocket";
import { initializeCallWebSocket } from "./callWebsocket";
import { sendNewMessageNotification } from "./pushNotifications";

export async function registerRoutes(app: Express): Promise<Server> {
  await storage.seedBotUsers();

  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const { email, password, name } = result.data;

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const user = await storage.createUser({ email, password, name });
      const token = generateToken(user.id);

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const { email, password } = result.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValidPassword = await compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      await storage.updateUser(user.id, { isOnline: true, lastSeen: new Date() });

      const token = generateToken(user.id);

      res.json({
        user: { ...user, password: undefined },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.updateUser(req.userId!, { isOnline: false, lastSeen: new Date() });
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.put("/api/users/profile", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }

      const user = await storage.updateUser(req.userId!, result.data);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/users", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { online, newMembers, minAge, maxAge, nativeLanguage, learningLanguage, country, hobbies, topics, verifiedOnly } = req.query;
      
      const filters: any = { excludeId: req.userId };
      
      if (online === "true") {
        filters.isOnline = true;
      }
      
      if (newMembers === "true") {
        filters.isNew = true;
      }
      
      if (minAge) {
        filters.minAge = parseInt(minAge as string);
      }
      
      if (maxAge) {
        filters.maxAge = parseInt(maxAge as string);
      }
      
      if (nativeLanguage) {
        filters.nativeLanguage = nativeLanguage as string;
      }
      
      if (learningLanguage) {
        filters.learningLanguage = learningLanguage as string;
      }
      
      if (country) {
        filters.country = country as string;
      }
      
      if (hobbies) {
        filters.hobbies = hobbies as string;
      }
      
      if (topics) {
        filters.topics = topics as string;
      }
      
      if (verifiedOnly === "true") {
        filters.verifiedOnly = true;
      }

      const users = await storage.getUsers(filters);
      res.json(users.map(u => ({ ...u, password: undefined })));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.get("/api/users/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.get("/api/conversations", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const conversations = await storage.getConversations(req.userId!);
      res.json(conversations.map(c => ({
        user: { ...c.user, password: undefined },
        lastMessage: c.lastMessage,
      })));
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  app.get("/api/messages/:userId", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const messages = await storage.getMessages(req.userId!, req.params.userId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { receiverId, content } = req.body;
      
      if (!receiverId || !content) {
        return res.status(400).json({ error: "Receiver ID and content are required" });
      }

      const isBlocked = await storage.isBlocked(req.userId!, receiverId);
      if (isBlocked) {
        return res.status(403).json({ error: "Cannot send message to this user" });
      }

      const message = await storage.createMessage(req.userId!, receiverId, content);
      
      sendNewMessageNotification(req.userId!, receiverId, content).catch((err) => {
        console.error("Failed to send push notification:", err);
      });
      
      res.json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.post("/api/push-token", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { pushToken } = req.body;
      
      if (!pushToken || typeof pushToken !== "string") {
        return res.status(400).json({ error: "Push token is required" });
      }

      if (!pushToken.startsWith("ExponentPushToken[")) {
        return res.status(400).json({ error: "Invalid push token format" });
      }

      await storage.updateUser(req.userId!, { pushToken });
      res.json({ success: true });
    } catch (error) {
      console.error("Save push token error:", error);
      res.status(500).json({ error: "Failed to save push token" });
    }
  });

  app.delete("/api/push-token", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.updateUser(req.userId!, { pushToken: null as any });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete push token error:", error);
      res.status(500).json({ error: "Failed to delete push token" });
    }
  });

  app.post("/api/messages/:messageId/report", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { reason } = req.body;
      const report = await storage.reportMessage(req.params.messageId, req.userId!, reason);
      res.json(report);
    } catch (error) {
      console.error("Report message error:", error);
      res.status(500).json({ error: "Failed to report message" });
    }
  });

  app.post("/api/users/:userId/block", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const blocked = await storage.blockUser(req.userId!, req.params.userId);
      res.json(blocked);
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  app.delete("/api/users/:userId/block", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.unblockUser(req.userId!, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  app.post("/api/users/:userId/report", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { reason } = req.body;
      const report = await storage.reportUser(req.userId!, req.params.userId, reason);
      res.json(report);
    } catch (error) {
      console.error("Report user error:", error);
      res.status(500).json({ error: "Failed to report user" });
    }
  });

  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", authMiddleware, async (req: AuthenticatedRequest, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", authMiddleware, async (req: AuthenticatedRequest, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/profile-photos", authMiddleware, async (req: AuthenticatedRequest, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.photoURL);

      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const photos = user.photos || [];
      if (photos.length >= 4) {
        return res.status(400).json({ error: "Maximum 4 photos allowed" });
      }

      photos.push(objectPath);
      await storage.updateUser(req.userId!, { photos });

      res.status(200).json({ objectPath, photos });
    } catch (error) {
      console.error("Error setting profile photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/profile-photos/:index", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const index = parseInt(req.params.index);
      const user = await storage.getUser(req.userId!);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const photos = user.photos || [];
      if (index < 0 || index >= photos.length) {
        return res.status(400).json({ error: "Invalid photo index" });
      }

      photos.splice(index, 1);
      
      let avatarIndex = user.avatarIndex || 0;
      if (avatarIndex >= photos.length) {
        avatarIndex = Math.max(0, photos.length - 1);
      }

      await storage.updateUser(req.userId!, { photos, avatarIndex });

      res.json({ photos, avatarIndex });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/translate", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { text, targetLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: "Text and target language are required" });
      }

      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLanguage}`
      );
      
      const data = await response.json();
      
      if (data.responseStatus === 200) {
        res.json({ translatedText: data.responseData.translatedText });
      } else {
        res.status(400).json({ error: "Translation failed" });
      }
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: "Failed to translate" });
    }
  });

  const httpServer = createServer(app);

  initializeWebSocket(httpServer);
  initializeCallWebSocket(httpServer);

  return httpServer;
}
