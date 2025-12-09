import { WebSocketServer, WebSocket } from "ws";
import type { Server, IncomingMessage } from "http";
import { verifyToken } from "./auth";
import { storage } from "./storage";

interface AuthenticatedCallWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

interface CallMessage {
  type: string;
  callId?: string;
  callType?: 'voice' | 'video';
  targetUserId?: string;
  callerName?: string;
  callerPhoto?: string;
}

interface ActiveCall {
  callId: string;
  callType: 'voice' | 'video';
  callerId: string;
  receiverId: string;
  status: 'ringing' | 'connected' | 'ended';
  startTime: Date;
}

class CallManager {
  private wss: WebSocketServer;
  private userConnections: Map<string, Set<AuthenticatedCallWebSocket>> = new Map();
  private activeCalls: Map<string, ActiveCall> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws/calls" });
    this.setupConnectionHandler();
    this.startHeartbeat();
  }

  private setupConnectionHandler() {
    this.wss.on("connection", async (ws: AuthenticatedCallWebSocket, req: IncomingMessage) => {
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
          const message: CallMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("Failed to parse call message:", error);
        }
      });

      ws.on("close", () => {
        this.removeConnection(decoded.userId, ws);
        this.handleUserDisconnect(decoded.userId);
      });

      ws.on("error", (error: Error) => {
        console.error("Call WebSocket error:", error);
      });
    });
  }

  private handleMessage(ws: AuthenticatedCallWebSocket, message: CallMessage) {
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

  private handleCallInitiate(callerId: string, message: CallMessage) {
    if (!message.targetUserId || !message.callId || !message.callType) {
      return;
    }

    const receiverConnections = this.userConnections.get(message.targetUserId);
    if (!receiverConnections || receiverConnections.size === 0) {
      this.sendToUser(callerId, {
        type: "user_offline",
        callId: message.callId,
      });
      return;
    }

    const call: ActiveCall = {
      callId: message.callId,
      callType: message.callType,
      callerId,
      receiverId: message.targetUserId,
      status: 'ringing',
      startTime: new Date(),
    };
    this.activeCalls.set(message.callId, call);

    this.sendToUser(message.targetUserId, {
      type: "incoming_call",
      callId: message.callId,
      callType: message.callType,
      callerId,
      callerName: message.callerName,
      callerPhoto: message.callerPhoto,
    });
  }

  private handleCallAccept(userId: string, message: CallMessage) {
    if (!message.callId) return;

    const call = this.activeCalls.get(message.callId);
    if (!call || call.receiverId !== userId) return;

    call.status = 'connected';
    this.activeCalls.set(message.callId, call);

    this.sendToUser(call.callerId, {
      type: "call_accepted",
      callId: message.callId,
    });
  }

  private handleCallReject(userId: string, message: CallMessage) {
    if (!message.callId) return;

    const call = this.activeCalls.get(message.callId);
    if (!call || call.receiverId !== userId) return;

    this.activeCalls.delete(message.callId);

    this.sendToUser(call.callerId, {
      type: "call_rejected",
      callId: message.callId,
    });
  }

  private handleCallEnd(userId: string, message: CallMessage) {
    if (!message.callId) return;

    const call = this.activeCalls.get(message.callId);
    if (!call) return;

    this.activeCalls.delete(message.callId);

    const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
    this.sendToUser(otherUserId, {
      type: "call_ended",
      callId: message.callId,
    });
  }

  private handleCallBusy(userId: string, message: CallMessage) {
    if (!message.callId) return;

    const call = this.activeCalls.get(message.callId);
    if (!call || call.receiverId !== userId) return;

    this.activeCalls.delete(message.callId);

    this.sendToUser(call.callerId, {
      type: "call_busy",
      callId: message.callId,
    });
  }

  private handleUserDisconnect(userId: string) {
    this.activeCalls.forEach((call, callId) => {
      if (call.callerId === userId || call.receiverId === userId) {
        const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
        this.sendToUser(otherUserId, {
          type: "call_ended",
          callId,
        });
        this.activeCalls.delete(callId);
      }
    });
  }

  private sendToUser(userId: string, message: object) {
    const connections = this.userConnections.get(userId);
    if (!connections) return;

    const messageStr = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  private addConnection(userId: string, ws: AuthenticatedCallWebSocket) {
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(ws);
  }

  private removeConnection(userId: string, ws: AuthenticatedCallWebSocket) {
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        this.userConnections.delete(userId);
      }
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((client) => {
        const ws = client as AuthenticatedCallWebSocket;
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
    }, 30000);
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.close();
  }
}

let callManager: CallManager | null = null;

export function initializeCallWebSocket(server: Server): CallManager {
  callManager = new CallManager(server);
  console.log("Call WebSocket server initialized on /ws/calls");
  return callManager;
}

export function getCallManager(): CallManager | null {
  return callManager;
}
