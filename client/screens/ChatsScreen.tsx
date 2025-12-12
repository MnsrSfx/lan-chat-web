import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/contexts/PresenceContext";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { getApiUrl } from "@/lib/query-client";
import type { User, Message } from "@shared/schema";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Conversation {
  user: User;
  lastMessage: Message;
}

export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { token } = useAuth();
  const { isUserOnline } = usePresence();
  const navigation = useNavigation<NavigationProp>();

  const { data: conversations = [], isLoading, refetch, isRefetching } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const response = await fetch(new URL("/api/conversations", getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
    refetchInterval: 5000,
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

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    } else {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Pressable
      style={({ pressed }) => [
        styles.conversationCard,
        { backgroundColor: theme.cardBackground, opacity: pressed ? 0.95 : 1 },
      ]}
      onPress={() => navigation.navigate("Chat", { user: item.user })}
    >
      <View style={styles.avatarContainer}>
        <Image source={getAvatarSource(item.user)} style={styles.avatar} />
        {isUserOnline(item.user.id) && <View style={[styles.onlineIndicator, { backgroundColor: theme.online }]} />}
      </View>

      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <ThemedText style={styles.userName} numberOfLines={1}>
            {item.user.name}
          </ThemedText>
          <ThemedText style={[styles.timestamp, { color: theme.textSecondary }]}>
            {formatTime(item.lastMessage.createdAt!)}
          </ThemedText>
        </View>
        <ThemedText style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.lastMessage.content}
        </ThemedText>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <ThemedText style={styles.headerTitle}>Chats</ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.user.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyTitle, { color: theme.textSecondary }]}>
                No conversations yet
              </ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Start a conversation in Community
              </ThemedText>
            </View>
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  conversationInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  userName: {
    ...Typography.body,
    fontWeight: "600",
    flex: 1,
  },
  timestamp: {
    ...Typography.caption,
    marginLeft: Spacing.sm,
  },
  lastMessage: {
    ...Typography.small,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: Spacing["5xl"] * 2,
  },
  emptyTitle: {
    ...Typography.body,
    fontWeight: "600",
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    ...Typography.small,
    marginTop: Spacing.xs,
  },
});
