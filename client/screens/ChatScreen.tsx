import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { getApiUrl } from "@/lib/query-client";
import type { Message, User } from "@shared/schema";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;

interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { token, user: currentUser } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ChatRouteProp>();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const { user: chatUser } = route.params;
  const [message, setMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          style={styles.headerTitle}
          onPress={() => navigation.navigate("UserProfile", { userId: chatUser.id })}
        >
          <Image source={getAvatarSource(chatUser)} style={styles.headerAvatar} />
          <View>
            <ThemedText style={styles.headerName}>{chatUser.name}</ThemedText>
            {chatUser.isOnline && (
              <ThemedText style={[styles.headerStatus, { color: theme.online }]}>Online</ThemedText>
            )}
          </View>
        </Pressable>
      ),
    });
  }, [navigation, chatUser, theme]);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", chatUser.id],
    queryFn: async () => {
      const response = await fetch(
        new URL(`/api/messages/${chatUser.id}`, getApiUrl()).toString(),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(new URL("/api/messages", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: chatUser.id, content }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", chatUser.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessage("");
    },
  });

  const translateMutation = useMutation({
    mutationFn: async (text: string): Promise<TranslationResult> => {
      const response = await fetch(new URL("/api/translate", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          targetLanguage: currentUser?.nativeLanguage || "English",
        }),
      });
      if (!response.ok) throw new Error("Translation failed");
      return response.json();
    },
    onSuccess: (data) => {
      setTranslatedText(data.translatedText);
    },
    onError: () => {
      Alert.alert("Translation Failed", "Unable to translate this message.");
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(
        new URL(`/api/messages/${messageId}/report`, getApiUrl()).toString(),
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to report message");
    },
    onSuccess: () => {
      Alert.alert("Message Reported", "Thank you for reporting this message.");
      setShowContextMenu(false);
      setSelectedMessage(null);
    },
  });

  const getAvatarSource = useCallback((user: User) => {
    const photos = user.photos || [];
    const avatarIndex = user.avatarIndex || 0;
    const photo = photos[avatarIndex] || photos[0];
    
    if (photo) {
      if (photo.startsWith("/avatars/")) {
        const avatarMap: Record<string, any> = {
          "/avatars/avatar1.png": require("../../assets/avatars/avatar1.png"),
          "/avatars/avatar2.png": require("../../assets/avatars/avatar2.png"),
          "/avatars/avatar3.png": require("../../assets/avatars/avatar3.png"),
          "/avatars/avatar4.png": require("../../assets/avatars/avatar4.png"),
          "/avatars/avatar5.png": require("../../assets/avatars/avatar5.png"),
          "/avatars/avatar6.png": require("../../assets/avatars/avatar6.png"),
        };
        return avatarMap[photo] || require("../../assets/avatars/avatar1.png");
      }
      return { uri: new URL(photo.startsWith("/objects/") ? photo : `/objects/${photo}`, getApiUrl()).toString() };
    }
    return require("../../assets/avatars/avatar1.png");
  }, []);

  const handleLongPress = (msg: Message) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedMessage(msg);
    setTranslatedText(null);
    setShowContextMenu(true);
  };

  const handleCopy = async () => {
    if (selectedMessage) {
      await Clipboard.setStringAsync(selectedMessage.content);
      setShowContextMenu(false);
      setSelectedMessage(null);
    }
  };

  const handleTranslate = () => {
    if (selectedMessage) {
      translateMutation.mutate(selectedMessage.content);
    }
  };

  const handleReport = () => {
    if (selectedMessage) {
      Alert.alert(
        "Report Message",
        "Are you sure you want to report this message?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Report", style: "destructive", onPress: () => reportMutation.mutate(selectedMessage.id) },
        ]
      );
    }
  };

  const handleSend = () => {
    if (message.trim()) {
      sendMutation.mutate(message.trim());
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isSent = item.senderId === currentUser?.id;
    const showAvatar = !isSent && (index === 0 || messages[index - 1]?.senderId !== item.senderId);

    return (
      <Pressable
        onLongPress={() => handleLongPress(item)}
        style={[styles.messageRow, isSent && styles.messageRowSent]}
      >
        {!isSent && (
          <View style={styles.avatarPlaceholder}>
            {showAvatar && <Image source={getAvatarSource(chatUser)} style={styles.messageAvatar} />}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isSent
              ? { backgroundColor: theme.messageSent }
              : { backgroundColor: theme.messageReceived },
          ]}
        >
          <ThemedText style={[styles.messageText, isSent && { color: "#FFFFFF" }]}>
            {item.content}
          </ThemedText>
          <ThemedText
            style={[
              styles.messageTime,
              { color: isSent ? "rgba(255,255,255,0.7)" : theme.textSecondary },
            ]}
          >
            {formatTime(item.createdAt!)}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={48} color={theme.textSecondary} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              Start the conversation
            </ThemedText>
          </View>
        }
      />

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm, backgroundColor: theme.backgroundRoot }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
          placeholder="Type a message..."
          placeholderTextColor={theme.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: theme.primary, opacity: message.trim() ? (pressed ? 0.8 : 1) : 0.5 },
          ]}
          onPress={handleSend}
          disabled={!message.trim() || sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="send" size={20} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      <Modal visible={showContextMenu} animationType="fade" transparent>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowContextMenu(false);
            setSelectedMessage(null);
            setTranslatedText(null);
          }}
        >
          <View style={[styles.contextMenu, { backgroundColor: theme.backgroundRoot }]}>
            {translatedText && (
              <View style={[styles.translationResult, { borderBottomColor: theme.border }]}>
                <ThemedText style={styles.translationText}>{translatedText}</ThemedText>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.contextMenuItem, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleTranslate}
            >
              <Feather name="globe" size={20} color={theme.primary} />
              <ThemedText style={[styles.contextMenuText, { color: theme.primary }]}>
                {translateMutation.isPending ? "Translating..." : `Translate to ${currentUser?.nativeLanguage || "English"}`}
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.contextMenuItem, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleCopy}
            >
              <Feather name="copy" size={20} color={theme.text} />
              <ThemedText style={styles.contextMenuText}>Copy</ThemedText>
            </Pressable>

            {selectedMessage?.senderId !== currentUser?.id && (
              <Pressable
                style={({ pressed }) => [styles.contextMenuItem, { opacity: pressed ? 0.7 : 1 }]}
                onPress={handleReport}
              >
                <Feather name="flag" size={20} color={theme.error} />
                <ThemedText style={[styles.contextMenuText, { color: theme.error }]}>Report</ThemedText>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  headerName: {
    ...Typography.body,
    fontWeight: "600",
  },
  headerStatus: {
    ...Typography.caption,
  },
  messageList: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  messageRowSent: {
    justifyContent: "flex-end",
  },
  avatarPlaceholder: {
    width: 28,
    marginRight: Spacing.sm,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  messageText: {
    ...Typography.body,
  },
  messageTime: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    alignSelf: "flex-end",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Spacing["5xl"] * 2,
  },
  emptyText: {
    ...Typography.body,
    marginTop: Spacing.lg,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  contextMenu: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    minWidth: 250,
    overflow: "hidden",
  },
  translationResult: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  translationText: {
    ...Typography.body,
    fontStyle: "italic",
  },
  contextMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  contextMenuText: {
    ...Typography.body,
  },
});
