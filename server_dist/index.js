var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";

// server/routes.ts
import { createServer } from "node:http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  blockedUsers: () => blockedUsers,
  blockedUsersRelations: () => blockedUsersRelations,
  insertUserSchema: () => insertUserSchema,
  loginSchema: () => loginSchema,
  messages: () => messages,
  messagesRelations: () => messagesRelations,
  registerSchema: () => registerSchema,
  reports: () => reports,
  reportsRelations: () => reportsRelations,
  updateProfileSchema: () => updateProfileSchema,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  age: integer("age"),
  nativeLanguage: text("native_language"),
  learningLanguages: jsonb("learning_languages").$type().default([]),
  hobbies: text("hobbies"),
  topics: text("topics"),
  country: text("country"),
  photos: jsonb("photos").$type().default([]),
  avatarIndex: integer("avatar_index").default(0),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  isBot: boolean("is_bot").default(false),
  pushToken: text("push_token"),
  isVerified: boolean("is_verified").default(false),
  verificationLevel: text("verification_level").default("none")
});
var usersRelations = relations(users, ({ many }) => ({
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  blockedUsers: many(blockedUsers, { relationName: "blocker" }),
  blockedBy: many(blockedUsers, { relationName: "blocked" }),
  reportsMade: many(reports, { relationName: "reporter" }),
  reportsReceived: many(reports, { relationName: "reported" })
}));
var messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isReported: boolean("is_reported").default(false)
});
var messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender"
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver"
  })
}));
var blockedUsers = pgTable("blocked_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blockerId: varchar("blocker_id").notNull().references(() => users.id),
  blockedId: varchar("blocked_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow()
});
var blockedUsersRelations = relations(blockedUsers, ({ one }) => ({
  blocker: one(users, {
    fields: [blockedUsers.blockerId],
    references: [users.id],
    relationName: "blocker"
  }),
  blocked: one(users, {
    fields: [blockedUsers.blockedId],
    references: [users.id],
    relationName: "blocked"
  })
}));
var reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reportedId: varchar("reported_id").notNull().references(() => users.id),
  messageId: varchar("message_id").references(() => messages.id),
  reason: text("reason"),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var reportsRelations = relations(reports, ({ one }) => ({
  reporter: one(users, {
    fields: [reports.reporterId],
    references: [users.id],
    relationName: "reporter"
  }),
  reported: one(users, {
    fields: [reports.reportedId],
    references: [users.id],
    relationName: "reported"
  }),
  message: one(messages, {
    fields: [reports.messageId],
    references: [messages.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true
});
var loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
var registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2)
});
var updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  age: z.number().min(18).max(100).optional(),
  nativeLanguage: z.string().optional(),
  learningLanguages: z.array(z.string()).optional(),
  hobbies: z.string().optional(),
  topics: z.string().optional(),
  country: z.string().optional(),
  photos: z.array(z.string()).optional(),
  avatarIndex: z.number().min(0).max(3).optional()
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { eq, and, or, desc, sql as sql2, ne, notInArray, gte } from "drizzle-orm";

// server/auth.ts
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { createRequire } from "module";
var require2 = createRequire(import.meta.url);
var jwt = require2("jsonwebtoken");
var scryptAsync = promisify(scrypt);
var JWT_SECRET = process.env.SESSION_SECRET || "lanchat-secret-key-change-in-production";
async function hash(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}
async function compare(password, storedHash) {
  const [salt, hashKey] = storedHash.split(":");
  const derivedKey = await scryptAsync(password, salt, 64);
  const storedKey = Buffer.from(hashKey, "hex");
  return timingSafeEqual(derivedKey, storedKey);
}
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }
  req.userId = decoded.userId;
  next();
}

// server/storage.ts
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || void 0;
  }
  async createUser(insertUser) {
    const hashedPassword = await hash(insertUser.password);
    const [user] = await db.insert(users).values({
      ...insertUser,
      email: insertUser.email.toLowerCase(),
      password: hashedPassword
    }).returning();
    return user;
  }
  async updateUser(id, data) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || void 0;
  }
  async getUsers(filters) {
    let query = db.select().from(users);
    const conditions = [];
    if (filters?.excludeId) {
      const blockedIds = await this.getBlockedUsers(filters.excludeId);
      const blockedByIds = await this.getBlockedByUsers(filters.excludeId);
      const allBlockedIds = [...blockedIds, ...blockedByIds];
      conditions.push(ne(users.id, filters.excludeId));
      if (allBlockedIds.length > 0) {
        conditions.push(notInArray(users.id, allBlockedIds));
      }
    }
    if (filters?.isOnline !== void 0) {
      conditions.push(eq(users.isOnline, filters.isOnline));
    }
    if (filters?.isNew) {
      const oneWeekAgo = /* @__PURE__ */ new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      conditions.push(gte(users.createdAt, oneWeekAgo));
    }
    if (filters?.minAge !== void 0) {
      conditions.push(or(sql2`${users.age} IS NULL`, gte(users.age, filters.minAge)));
    }
    if (filters?.maxAge !== void 0) {
      conditions.push(or(sql2`${users.age} IS NULL`, sql2`${users.age} <= ${filters.maxAge}`));
    }
    if (filters?.nativeLanguage) {
      conditions.push(sql2`LOWER(${users.nativeLanguage}) = LOWER(${filters.nativeLanguage})`);
    }
    if (filters?.learningLanguage) {
      conditions.push(sql2`${users.learningLanguages}::jsonb @> ${JSON.stringify([filters.learningLanguage])}::jsonb`);
    }
    if (filters?.country) {
      conditions.push(sql2`LOWER(${users.country}) = LOWER(${filters.country})`);
    }
    if (filters?.hobbies) {
      conditions.push(sql2`LOWER(${users.hobbies}) LIKE LOWER(${"%" + filters.hobbies + "%"})`);
    }
    if (filters?.topics) {
      conditions.push(sql2`LOWER(${users.topics}) LIKE LOWER(${"%" + filters.topics + "%"})`);
    }
    if (filters?.verifiedOnly) {
      conditions.push(eq(users.isVerified, true));
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return query.orderBy(desc(users.isOnline), desc(users.lastSeen));
  }
  async getMessages(userId1, userId2) {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    ).orderBy(messages.createdAt);
  }
  async createMessage(senderId, receiverId, content) {
    const [message] = await db.insert(messages).values({
      senderId,
      receiverId,
      content
    }).returning();
    return message;
  }
  async getConversations(userId) {
    const allMessages = await db.select().from(messages).where(
      or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      )
    ).orderBy(desc(messages.createdAt));
    const conversationMap = /* @__PURE__ */ new Map();
    for (const msg of allMessages) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, msg);
      }
    }
    const conversations = [];
    for (const [otherUserId, lastMessage] of conversationMap) {
      const user = await this.getUser(otherUserId);
      if (user) {
        const isBlocked = await this.isBlocked(userId, otherUserId);
        if (!isBlocked) {
          conversations.push({ user, lastMessage });
        }
      }
    }
    return conversations.sort(
      (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    );
  }
  async reportMessage(messageId, reporterId, reason) {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) {
      throw new Error("Message not found");
    }
    await db.update(messages).set({ isReported: true }).where(eq(messages.id, messageId));
    const [report] = await db.insert(reports).values({
      reporterId,
      reportedId: message.senderId,
      messageId,
      reason,
      type: "message"
    }).returning();
    return report;
  }
  async blockUser(blockerId, blockedId) {
    const existing = await db.select().from(blockedUsers).where(
      and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId))
    );
    if (existing.length > 0) {
      return existing[0];
    }
    const [blocked] = await db.insert(blockedUsers).values({
      blockerId,
      blockedId
    }).returning();
    return blocked;
  }
  async unblockUser(blockerId, blockedId) {
    await db.delete(blockedUsers).where(
      and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId))
    );
  }
  async getBlockedUsers(userId) {
    const blocked = await db.select().from(blockedUsers).where(eq(blockedUsers.blockerId, userId));
    return blocked.map((b) => b.blockedId);
  }
  async getBlockedByUsers(userId) {
    const blocked = await db.select().from(blockedUsers).where(eq(blockedUsers.blockedId, userId));
    return blocked.map((b) => b.blockerId);
  }
  async isBlocked(userId, targetId) {
    const blocked = await db.select().from(blockedUsers).where(
      or(
        and(eq(blockedUsers.blockerId, userId), eq(blockedUsers.blockedId, targetId)),
        and(eq(blockedUsers.blockerId, targetId), eq(blockedUsers.blockedId, userId))
      )
    );
    return blocked.length > 0;
  }
  async reportUser(reporterId, reportedId, reason) {
    const [report] = await db.insert(reports).values({
      reporterId,
      reportedId,
      reason,
      type: "profile"
    }).returning();
    return report;
  }
  async seedBotUsers() {
    const existingBots = await db.select().from(users).where(eq(users.isBot, true));
    if (existingBots.length > 0) {
      return;
    }
    const botUsers = [
      {
        email: "sofia@lanchat.bot",
        password: "botpassword123",
        name: "Sofia Martinez",
        age: 28,
        nativeLanguage: "Spanish",
        learningLanguages: ["English", "French"],
        hobbies: "Photography, hiking, cooking traditional recipes",
        topics: "Travel, culture, food, music",
        photos: ["/avatars/avatar1.png"],
        avatarIndex: 0,
        isOnline: true,
        isBot: true
      },
      {
        email: "james@lanchat.bot",
        password: "botpassword123",
        name: "James Wilson",
        age: 32,
        nativeLanguage: "English",
        learningLanguages: ["Japanese", "Korean"],
        hobbies: "Gaming, anime, martial arts",
        topics: "Technology, gaming, movies, sports",
        photos: ["/avatars/avatar2.png"],
        avatarIndex: 0,
        isOnline: true,
        isBot: true
      },
      {
        email: "maria@lanchat.bot",
        password: "botpassword123",
        name: "Maria Chen",
        age: 35,
        nativeLanguage: "Chinese",
        learningLanguages: ["English", "Spanish"],
        hobbies: "Reading, yoga, painting",
        topics: "Art, literature, wellness, business",
        photos: ["/avatars/avatar3.png"],
        avatarIndex: 0,
        isOnline: false,
        isBot: true
      },
      {
        email: "yuki@lanchat.bot",
        password: "botpassword123",
        name: "Yuki Tanaka",
        age: 25,
        nativeLanguage: "Japanese",
        learningLanguages: ["English", "German"],
        hobbies: "Music, piano, coffee brewing",
        topics: "Music, fashion, lifestyle, anime",
        photos: ["/avatars/avatar4.png"],
        avatarIndex: 0,
        isOnline: true,
        isBot: true
      },
      {
        email: "amara@lanchat.bot",
        password: "botpassword123",
        name: "Amara Johnson",
        age: 29,
        nativeLanguage: "English",
        learningLanguages: ["French", "Portuguese"],
        hobbies: "Dancing, fitness, traveling",
        topics: "Dance, health, travel, culture",
        photos: ["/avatars/avatar5.png"],
        avatarIndex: 0,
        isOnline: true,
        isBot: true
      },
      {
        email: "carlos@lanchat.bot",
        password: "botpassword123",
        name: "Carlos Rodriguez",
        age: 31,
        nativeLanguage: "Portuguese",
        learningLanguages: ["English", "Italian"],
        hobbies: "Soccer, cooking, surfing",
        topics: "Sports, food, beach life, music",
        photos: ["/avatars/avatar6.png"],
        avatarIndex: 0,
        isOnline: false,
        isBot: true
      }
    ];
    for (const bot of botUsers) {
      const hashedPassword = await hash(bot.password);
      await db.insert(users).values({
        ...bot,
        password: hashedPassword
      });
    }
  }
};
var storage = new DatabaseStorage();

// server/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";

// server/objectAcl.ts
var ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  throw new Error(`Unknown access group type: ${group.type}`);
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}

// server/objectStorage.ts
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token"
      }
    },
    universe_domain: "googleapis.com"
  },
  projectId: ""
});
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var ObjectStorageService = class {
  constructor() {
  }
  getPublicObjectSearchPaths() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr.split(",").map((path2) => path2.trim()).filter((path2) => path2.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }
  getPrivateObjectDir() {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }
  async searchPublicObject(filePath) {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }
  async downloadObject(file, res, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
  async getObjectEntityUploadURL() {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900
    });
  }
  async getObjectEntityFile(objectPath) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }
  normalizeObjectEntityPath(rawPath) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }
    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
  async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission
  }) {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? "read" /* READ */
    });
  }
};
function parseObjectPath(path2) {
  if (!path2.startsWith("/")) {
    path2 = `/${path2}`;
  }
  const pathParts = path2.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

// server/websocket.ts
import { WebSocketServer, WebSocket } from "ws";
var OFFLINE_GRACE_PERIOD_MS = 15e3;
var PresenceManager = class {
  wss;
  userConnections = /* @__PURE__ */ new Map();
  offlineTimeouts = /* @__PURE__ */ new Map();
  heartbeatInterval = null;
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.setupConnectionHandler();
    this.startHeartbeat();
  }
  setupConnectionHandler() {
    this.wss.on("connection", async (ws, req) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      if (!token) {
        ws.close(4001, "No token provided");
        return;
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        ws.close(4002, "Invalid token");
        return;
      }
      const user = await storage.getUser(decoded.userId);
      if (!user) {
        ws.close(4003, "User not found");
        return;
      }
      ws.userId = decoded.userId;
      ws.isAlive = true;
      const existingTimeout = this.offlineTimeouts.get(decoded.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        this.offlineTimeouts.delete(decoded.userId);
      }
      const wasOffline = !this.userConnections.has(decoded.userId) || this.userConnections.get(decoded.userId).size === 0;
      this.addConnection(decoded.userId, ws);
      if (wasOffline) {
        await this.setUserOnline(decoded.userId, true);
      } else {
        this.broadcastUserStatus(decoded.userId, true);
      }
      this.sendOnlineUsers(ws);
      ws.on("pong", () => {
        ws.isAlive = true;
      });
      ws.on("close", () => {
        this.removeConnection(decoded.userId, ws);
        if (!this.userConnections.has(decoded.userId) || this.userConnections.get(decoded.userId).size === 0) {
          this.scheduleOffline(decoded.userId);
        }
      });
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
    });
  }
  addConnection(userId, ws) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, /* @__PURE__ */ new Set());
    }
    this.userConnections.get(userId).add(ws);
  }
  removeConnection(userId, ws) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }
  scheduleOffline(userId) {
    const existingTimeout = this.offlineTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    const timeout = setTimeout(async () => {
      if (!this.userConnections.has(userId) || this.userConnections.get(userId).size === 0) {
        await this.setUserOnline(userId, false);
      }
      this.offlineTimeouts.delete(userId);
    }, OFFLINE_GRACE_PERIOD_MS);
    this.offlineTimeouts.set(userId, timeout);
  }
  async setUserOnline(userId, isOnline) {
    const currentlyOnline = this.isUserOnline(userId);
    if (!isOnline && currentlyOnline) {
      return;
    }
    try {
      await storage.updateUser(userId, {
        isOnline,
        lastSeen: /* @__PURE__ */ new Date()
      });
    } catch (error) {
      console.error("Failed to update user online status:", error);
    }
    this.broadcastUserStatus(userId, isOnline);
  }
  broadcastUserStatus(userId, isOnline) {
    const message = {
      type: "user_status",
      userId,
      isOnline
    };
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
  sendOnlineUsers(ws) {
    const onlineUsers = Array.from(this.userConnections.keys());
    const message = {
      type: "presence",
      onlineUsers
    };
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        const ws = client;
        if (ws.isAlive === false) {
          if (ws.userId) {
            this.removeConnection(ws.userId, ws);
            this.scheduleOffline(ws.userId);
          }
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 3e4);
  }
  getOnlineUsers() {
    return Array.from(this.userConnections.keys());
  }
  isUserOnline(userId) {
    return this.userConnections.has(userId) && this.userConnections.get(userId).size > 0;
  }
  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.offlineTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.offlineTimeouts.clear();
    this.wss.close();
  }
};
var presenceManager = null;
function initializeWebSocket(server) {
  presenceManager = new PresenceManager(server);
  console.log("WebSocket server initialized on /ws");
  return presenceManager;
}

// server/callWebsocket.ts
import { WebSocketServer as WebSocketServer2, WebSocket as WebSocket2 } from "ws";
var CallManager = class {
  wss;
  userConnections = /* @__PURE__ */ new Map();
  activeCalls = /* @__PURE__ */ new Map();
  heartbeatInterval = null;
  constructor(server) {
    this.wss = new WebSocketServer2({ server, path: "/ws/calls" });
    this.setupConnectionHandler();
    this.startHeartbeat();
  }
  setupConnectionHandler() {
    this.wss.on("connection", async (ws, req) => {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      if (!token) {
        ws.close(4001, "No token provided");
        return;
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        ws.close(4002, "Invalid token");
        return;
      }
      const user = await storage.getUser(decoded.userId);
      if (!user) {
        ws.close(4003, "User not found");
        return;
      }
      ws.userId = decoded.userId;
      ws.isAlive = true;
      this.addConnection(decoded.userId, ws);
      ws.on("pong", () => {
        ws.isAlive = true;
      });
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("Failed to parse call message:", error);
        }
      });
      ws.on("close", () => {
        this.removeConnection(decoded.userId, ws);
        this.handleUserDisconnect(decoded.userId);
      });
      ws.on("error", (error) => {
        console.error("Call WebSocket error:", error);
      });
    });
  }
  handleMessage(ws, message) {
    if (!ws.userId) return;
    switch (message.type) {
      case "call_initiate":
        this.handleCallInitiate(ws.userId, message);
        break;
      case "call_accept":
        this.handleCallAccept(ws.userId, message);
        break;
      case "call_reject":
        this.handleCallReject(ws.userId, message);
        break;
      case "call_end":
        this.handleCallEnd(ws.userId, message);
        break;
      case "call_busy":
        this.handleCallBusy(ws.userId, message);
        break;
    }
  }
  handleCallInitiate(callerId, message) {
    if (!message.targetUserId || !message.callId || !message.callType) {
      return;
    }
    const receiverConnections = this.userConnections.get(message.targetUserId);
    if (!receiverConnections || receiverConnections.size === 0) {
      this.sendToUser(callerId, {
        type: "user_offline",
        callId: message.callId
      });
      return;
    }
    const call = {
      callId: message.callId,
      callType: message.callType,
      callerId,
      receiverId: message.targetUserId,
      status: "ringing",
      startTime: /* @__PURE__ */ new Date()
    };
    this.activeCalls.set(message.callId, call);
    this.sendToUser(message.targetUserId, {
      type: "incoming_call",
      callId: message.callId,
      callType: message.callType,
      callerId,
      callerName: message.callerName,
      callerPhoto: message.callerPhoto
    });
  }
  handleCallAccept(userId, message) {
    if (!message.callId) return;
    const call = this.activeCalls.get(message.callId);
    if (!call || call.receiverId !== userId) return;
    call.status = "connected";
    this.activeCalls.set(message.callId, call);
    this.sendToUser(call.callerId, {
      type: "call_accepted",
      callId: message.callId
    });
  }
  handleCallReject(userId, message) {
    if (!message.callId) return;
    const call = this.activeCalls.get(message.callId);
    if (!call || call.receiverId !== userId) return;
    this.activeCalls.delete(message.callId);
    this.sendToUser(call.callerId, {
      type: "call_rejected",
      callId: message.callId
    });
  }
  handleCallEnd(userId, message) {
    if (!message.callId) return;
    const call = this.activeCalls.get(message.callId);
    if (!call) return;
    this.activeCalls.delete(message.callId);
    const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
    this.sendToUser(otherUserId, {
      type: "call_ended",
      callId: message.callId
    });
  }
  handleCallBusy(userId, message) {
    if (!message.callId) return;
    const call = this.activeCalls.get(message.callId);
    if (!call || call.receiverId !== userId) return;
    this.activeCalls.delete(message.callId);
    this.sendToUser(call.callerId, {
      type: "call_busy",
      callId: message.callId
    });
  }
  handleUserDisconnect(userId) {
    this.activeCalls.forEach((call, callId) => {
      if (call.callerId === userId || call.receiverId === userId) {
        const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
        this.sendToUser(otherUserId, {
          type: "call_ended",
          callId
        });
        this.activeCalls.delete(callId);
      }
    });
  }
  sendToUser(userId, message) {
    const connections = this.userConnections.get(userId);
    if (!connections) return;
    const messageStr = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket2.OPEN) {
        ws.send(messageStr);
      }
    });
  }
  addConnection(userId, ws) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, /* @__PURE__ */ new Set());
    }
    this.userConnections.get(userId).add(ws);
  }
  removeConnection(userId, ws) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        const ws = client;
        if (ws.isAlive === false) {
          if (ws.userId) {
            this.removeConnection(ws.userId, ws);
            this.handleUserDisconnect(ws.userId);
          }
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 3e4);
  }
  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
};
var callManager = null;
function initializeCallWebSocket(server) {
  callManager = new CallManager(server);
  console.log("Call WebSocket server initialized on /ws/calls");
  return callManager;
}

// server/pushNotifications.ts
async function sendPushNotification(receiverId, title, body, data) {
  try {
    const receiver = await storage.getUser(receiverId);
    if (!receiver?.pushToken) {
      return false;
    }
    if (!receiver.pushToken.startsWith("ExponentPushToken[")) {
      console.log("Invalid push token format for user:", receiverId);
      return false;
    }
    const message = {
      to: receiver.pushToken,
      sound: "default",
      title,
      body,
      data
    };
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json"
      },
      body: JSON.stringify([message])
    });
    const result = await response.json();
    const tickets = result.data;
    if (tickets && tickets.length > 0) {
      const ticket = tickets[0];
      if (ticket.status === "error") {
        console.error("Push notification error:", ticket.message, ticket.details);
        if (ticket.details?.error === "DeviceNotRegistered") {
          await storage.updateUser(receiverId, { pushToken: null });
        }
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
}
async function sendNewMessageNotification(senderId, receiverId, messageContent) {
  try {
    const sender = await storage.getUser(senderId);
    if (!sender) {
      return false;
    }
    const truncatedMessage = messageContent.length > 100 ? messageContent.substring(0, 100) + "..." : messageContent;
    return await sendPushNotification(
      receiverId,
      `New message from ${sender.name}`,
      truncatedMessage,
      {
        type: "new_message",
        senderId,
        senderName: sender.name
      }
    );
  } catch (error) {
    console.error("Failed to send new message notification:", error);
    return false;
  }
}

// server/routes.ts
async function registerRoutes(app2) {
  await storage.seedBotUsers();
  app2.post("/api/auth/register", async (req, res) => {
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
        user: { ...user, password: void 0 },
        token
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
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
      await storage.updateUser(user.id, { isOnline: true, lastSeen: /* @__PURE__ */ new Date() });
      const token = generateToken(user.id);
      res.json({
        user: { ...user, password: void 0 },
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  app2.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: void 0 });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  app2.post("/api/auth/logout", authMiddleware, async (req, res) => {
    try {
      await storage.updateUser(req.userId, { isOnline: false, lastSeen: /* @__PURE__ */ new Date() });
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });
  app2.put("/api/users/profile", authMiddleware, async (req, res) => {
    try {
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.errors[0].message });
      }
      const user = await storage.updateUser(req.userId, result.data);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: void 0 });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  app2.get("/api/users", authMiddleware, async (req, res) => {
    try {
      const { online, newMembers, minAge, maxAge, nativeLanguage, learningLanguage, country, hobbies, topics, verifiedOnly } = req.query;
      const filters = { excludeId: req.userId };
      if (online === "true") {
        filters.isOnline = true;
      }
      if (newMembers === "true") {
        filters.isNew = true;
      }
      if (minAge) {
        filters.minAge = parseInt(minAge);
      }
      if (maxAge) {
        filters.maxAge = parseInt(maxAge);
      }
      if (nativeLanguage) {
        filters.nativeLanguage = nativeLanguage;
      }
      if (learningLanguage) {
        filters.learningLanguage = learningLanguage;
      }
      if (country) {
        filters.country = country;
      }
      if (hobbies) {
        filters.hobbies = hobbies;
      }
      if (topics) {
        filters.topics = topics;
      }
      if (verifiedOnly === "true") {
        filters.verifiedOnly = true;
      }
      const users2 = await storage.getUsers(filters);
      res.json(users2.map((u) => ({ ...u, password: void 0 })));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });
  app2.get("/api/users/:id", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ ...user, password: void 0 });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  app2.get("/api/conversations", authMiddleware, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.userId);
      res.json(conversations.map((c) => ({
        user: { ...c.user, password: void 0 },
        lastMessage: c.lastMessage
      })));
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });
  app2.get("/api/messages/:userId", authMiddleware, async (req, res) => {
    try {
      const messages2 = await storage.getMessages(req.userId, req.params.userId);
      res.json(messages2);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });
  app2.post("/api/messages", authMiddleware, async (req, res) => {
    try {
      const { receiverId, content } = req.body;
      if (!receiverId || !content) {
        return res.status(400).json({ error: "Receiver ID and content are required" });
      }
      const isBlocked = await storage.isBlocked(req.userId, receiverId);
      if (isBlocked) {
        return res.status(403).json({ error: "Cannot send message to this user" });
      }
      const message = await storage.createMessage(req.userId, receiverId, content);
      sendNewMessageNotification(req.userId, receiverId, content).catch((err) => {
        console.error("Failed to send push notification:", err);
      });
      res.json(message);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  app2.post("/api/push-token", authMiddleware, async (req, res) => {
    try {
      const { pushToken } = req.body;
      if (!pushToken || typeof pushToken !== "string") {
        return res.status(400).json({ error: "Push token is required" });
      }
      if (!pushToken.startsWith("ExponentPushToken[")) {
        return res.status(400).json({ error: "Invalid push token format" });
      }
      await storage.updateUser(req.userId, { pushToken });
      res.json({ success: true });
    } catch (error) {
      console.error("Save push token error:", error);
      res.status(500).json({ error: "Failed to save push token" });
    }
  });
  app2.delete("/api/push-token", authMiddleware, async (req, res) => {
    try {
      await storage.updateUser(req.userId, { pushToken: null });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete push token error:", error);
      res.status(500).json({ error: "Failed to delete push token" });
    }
  });
  app2.post("/api/messages/:messageId/report", authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const report = await storage.reportMessage(req.params.messageId, req.userId, reason);
      res.json(report);
    } catch (error) {
      console.error("Report message error:", error);
      res.status(500).json({ error: "Failed to report message" });
    }
  });
  app2.post("/api/users/:userId/block", authMiddleware, async (req, res) => {
    try {
      const blocked = await storage.blockUser(req.userId, req.params.userId);
      res.json(blocked);
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });
  app2.delete("/api/users/:userId/block", authMiddleware, async (req, res) => {
    try {
      await storage.unblockUser(req.userId, req.params.userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });
  app2.post("/api/users/:userId/report", authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const report = await storage.reportUser(req.userId, req.params.userId, reason);
      res.json(report);
    } catch (error) {
      console.error("Report user error:", error);
      res.status(500).json({ error: "Failed to report user" });
    }
  });
  app2.get("/public-objects/:filePath(*)", async (req, res) => {
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
  app2.get("/objects/:objectPath(*)", authMiddleware, async (req, res) => {
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
  app2.post("/api/objects/upload", authMiddleware, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  app2.put("/api/profile-photos", authMiddleware, async (req, res) => {
    if (!req.body.photoURL) {
      return res.status(400).json({ error: "photoURL is required" });
    }
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.photoURL);
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const photos = user.photos || [];
      if (photos.length >= 4) {
        return res.status(400).json({ error: "Maximum 4 photos allowed" });
      }
      photos.push(objectPath);
      await storage.updateUser(req.userId, { photos });
      res.status(200).json({ objectPath, photos });
    } catch (error) {
      console.error("Error setting profile photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.delete("/api/profile-photos/:index", authMiddleware, async (req, res) => {
    try {
      const index = parseInt(req.params.index);
      const user = await storage.getUser(req.userId);
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
      await storage.updateUser(req.userId, { photos, avatarIndex });
      res.json({ photos, avatarIndex });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/translate", authMiddleware, async (req, res) => {
    try {
      const { text: text2, targetLanguage } = req.body;
      if (!text2 || !targetLanguage) {
        return res.status(400).json({ error: "Text and target language are required" });
      }
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text2)}&langpair=autodetect|${targetLanguage}`
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
  const httpServer = createServer(app2);
  initializeWebSocket(httpServer);
  initializeCallWebSocket(httpServer);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, _next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
