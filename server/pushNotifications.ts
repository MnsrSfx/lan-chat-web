import { storage } from "./storage";

interface ExpoPushMessage {
  to: string;
  sound?: string;
  title?: string;
  body?: string;
  data?: Record<string, any>;
}

interface ExpoPushTicket {
  id?: string;
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

export async function sendPushNotification(
  receiverId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  try {
    const receiver = await storage.getUser(receiverId);
    if (!receiver?.pushToken) {
      return false;
    }

    if (!receiver.pushToken.startsWith("ExponentPushToken[")) {
      console.log("Invalid push token format for user:", receiverId);
      return false;
    }

    const message: ExpoPushMessage = {
      to: receiver.pushToken,
      sound: "default",
      title,
      body,
      data,
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify([message]),
    });

    const result = await response.json();
    const tickets = result.data as ExpoPushTicket[];

    if (tickets && tickets.length > 0) {
      const ticket = tickets[0];
      if (ticket.status === "error") {
        console.error("Push notification error:", ticket.message, ticket.details);
        if (ticket.details?.error === "DeviceNotRegistered") {
          await storage.updateUser(receiverId, { pushToken: null as any });
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

export async function sendNewMessageNotification(
  senderId: string,
  receiverId: string,
  messageContent: string
): Promise<boolean> {
  try {
    const sender = await storage.getUser(senderId);
    if (!sender) {
      return false;
    }

    const truncatedMessage =
      messageContent.length > 100
        ? messageContent.substring(0, 100) + "..."
        : messageContent;

    return await sendPushNotification(
      receiverId,
      `New message from ${sender.name}`,
      truncatedMessage,
      {
        type: "new_message",
        senderId,
        senderName: sender.name,
      }
    );
  } catch (error) {
    console.error("Failed to send new message notification:", error);
    return false;
  }
}
