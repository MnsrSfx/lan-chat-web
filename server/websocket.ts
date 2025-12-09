import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "http";
import { verifyToken } from "./auth";
import { storage } from "./storage";

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface PresenceMessage {
  type: "presence" | "user_status";
  userId?: string;
  isOnline?: boolean;
  onlineUsers?: string[];
}

const OFFLINE_GRACE_PERIOD_MS = 15000;

class PresenceManager {
  private wss: WebSocketServer;
  private userConnections: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private offlineTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.setupConnectionHandler();
    this.startHeartbeat();
  }

  private setupConnectionHandler() {
    this.wss.on("connection", async (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
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

      const wasOffline = !this.userConnections.has(decoded.userId) || 
                         this.userConnections.get(decoded.userId)!.size === 0;

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
        
        if (!this.userConnections.has(decoded.userId) || 
            this.userConnections.get(decoded.userId)!.size === 0) {
          this.scheduleOffline(decoded.userId);
        }
      });

      ws.on("error", (error: Error) => {
        console.error("WebSocket error:", error);
      });
    });
  }

  private addConnection(userId: string, ws: AuthenticatedWebSocket) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(ws);
  }

  private removeConnection(userId: string, ws: AuthenticatedWebSocket) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  private scheduleOffline(userId: string) {
    const existingTimeout = this.offlineTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(async () => {
      if (!this.userConnections.has(userId) || 
          this.userConnections.get(userId)!.size === 0) {
        await this.setUserOnline(userId, false);
      }
      this.offlineTimeouts.delete(userId);
    }, OFFLINE_GRACE_PERIOD_MS);

    this.offlineTimeouts.set(userId, timeout);
  }

  private async setUserOnline(userId: string, isOnline: boolean) {
    const currentlyOnline = this.isUserOnline(userId);
    
    if (!isOnline && currentlyOnline) {
      return;
    }
    
    try {
      await storage.updateUser(userId, { 
        isOnline, 
        lastSeen: new Date() 
      });
    } catch (error) {
      console.error("Failed to update user online status:", error);
    }
    
    this.broadcastUserStatus(userId, isOnline);
  }

  private broadcastUserStatus(userId: string, isOnline: boolean) {
    const message: PresenceMessage = {
      type: "user_status",
      userId,
      isOnline,
    };

    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private sendOnlineUsers(ws: AuthenticatedWebSocket) {
    const onlineUsers = Array.from(this.userConnections.keys());
    const message: PresenceMessage = {
      type: "presence",
      onlineUsers,
    };
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        const ws = client as AuthenticatedWebSocket;
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
    }, 30000);
  }

  public getOnlineUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  public isUserOnline(userId: string): boolean {
    return this.userConnections.has(userId) && 
           this.userConnections.get(userId)!.size > 0;
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.offlineTimeouts.forEach(timeout => clearTimeout(timeout));
    this.offlineTimeouts.clear();
    this.wss.close();
  }
}

let presenceManager: PresenceManager | null = null;

export function initializeWebSocket(server: Server): PresenceManager {
  presenceManager = new PresenceManager(server);
  console.log("WebSocket server initialized on /ws");
  return presenceManager;
}

export function getPresenceManager(): PresenceManager | null {
  return presenceManager;
}
