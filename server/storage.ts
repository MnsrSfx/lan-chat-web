import { users, messages, blockedUsers, reports, type User, type InsertUser, type Message, type BlockedUser, type Report } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, ne, notInArray, gte } from "drizzle-orm";
import { hash, compare } from "./auth";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getUsers(filters?: { excludeId?: string; isOnline?: boolean; isNew?: boolean; minAge?: number; maxAge?: number }): Promise<User[]>;
  
  getMessages(userId1: string, userId2: string): Promise<Message[]>;
  createMessage(senderId: string, receiverId: string, content: string): Promise<Message>;
  getConversations(userId: string): Promise<{ user: User; lastMessage: Message }[]>;
  reportMessage(messageId: string, reporterId: string, reason?: string): Promise<Report>;
  
  blockUser(blockerId: string, blockedId: string): Promise<BlockedUser>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  getBlockedUsers(userId: string): Promise<string[]>;
  isBlocked(userId: string, targetId: string): Promise<boolean>;
  
  reportUser(reporterId: string, reportedId: string, reason?: string): Promise<Report>;
  
  seedBotUsers(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await hash(insertUser.password);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        email: insertUser.email.toLowerCase(),
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getUsers(filters?: { excludeId?: string; isOnline?: boolean; isNew?: boolean; minAge?: number; maxAge?: number }): Promise<User[]> {
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
    
    if (filters?.isOnline !== undefined) {
      conditions.push(eq(users.isOnline, filters.isOnline));
    }
    
    if (filters?.isNew) {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      conditions.push(gte(users.createdAt, oneWeekAgo));
    }
    
    if (filters?.minAge !== undefined) {
      conditions.push(gte(users.age, filters.minAge));
    }
    
    if (filters?.maxAge !== undefined) {
      conditions.push(sql`${users.age} <= ${filters.maxAge}`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return query.orderBy(desc(users.isOnline), desc(users.lastSeen));
  }

  async getMessages(userId1: string, userId2: string): Promise<Message[]> {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    ).orderBy(messages.createdAt);
  }

  async createMessage(senderId: string, receiverId: string, content: string): Promise<Message> {
    const [message] = await db.insert(messages).values({
      senderId,
      receiverId,
      content,
    }).returning();
    return message;
  }

  async getConversations(userId: string): Promise<{ user: User; lastMessage: Message }[]> {
    const allMessages = await db.select().from(messages).where(
      or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      )
    ).orderBy(desc(messages.createdAt));

    const conversationMap = new Map<string, Message>();
    
    for (const msg of allMessages) {
      const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, msg);
      }
    }

    const conversations: { user: User; lastMessage: Message }[] = [];
    
    for (const [otherUserId, lastMessage] of conversationMap) {
      const user = await this.getUser(otherUserId);
      if (user) {
        const isBlocked = await this.isBlocked(userId, otherUserId);
        if (!isBlocked) {
          conversations.push({ user, lastMessage });
        }
      }
    }

    return conversations.sort((a, b) => 
      new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime()
    );
  }

  async reportMessage(messageId: string, reporterId: string, reason?: string): Promise<Report> {
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
      type: "message",
    }).returning();
    
    return report;
  }

  async blockUser(blockerId: string, blockedId: string): Promise<BlockedUser> {
    const existing = await db.select().from(blockedUsers).where(
      and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId))
    );
    
    if (existing.length > 0) {
      return existing[0];
    }

    const [blocked] = await db.insert(blockedUsers).values({
      blockerId,
      blockedId,
    }).returning();
    return blocked;
  }

  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    await db.delete(blockedUsers).where(
      and(eq(blockedUsers.blockerId, blockerId), eq(blockedUsers.blockedId, blockedId))
    );
  }

  async getBlockedUsers(userId: string): Promise<string[]> {
    const blocked = await db.select().from(blockedUsers).where(eq(blockedUsers.blockerId, userId));
    return blocked.map(b => b.blockedId);
  }

  async getBlockedByUsers(userId: string): Promise<string[]> {
    const blocked = await db.select().from(blockedUsers).where(eq(blockedUsers.blockedId, userId));
    return blocked.map(b => b.blockerId);
  }

  async isBlocked(userId: string, targetId: string): Promise<boolean> {
    const blocked = await db.select().from(blockedUsers).where(
      or(
        and(eq(blockedUsers.blockerId, userId), eq(blockedUsers.blockedId, targetId)),
        and(eq(blockedUsers.blockerId, targetId), eq(blockedUsers.blockedId, userId))
      )
    );
    return blocked.length > 0;
  }

  async reportUser(reporterId: string, reportedId: string, reason?: string): Promise<Report> {
    const [report] = await db.insert(reports).values({
      reporterId,
      reportedId,
      reason,
      type: "profile",
    }).returning();
    return report;
  }

  async seedBotUsers(): Promise<void> {
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
        isBot: true,
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
        isBot: true,
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
        isBot: true,
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
        isBot: true,
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
        isBot: true,
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
        isBot: true,
      },
    ];

    for (const bot of botUsers) {
      const hashedPassword = await hash(bot.password);
      await db.insert(users).values({
        ...bot,
        password: hashedPassword,
      });
    }
  }
}

export const storage = new DatabaseStorage();
