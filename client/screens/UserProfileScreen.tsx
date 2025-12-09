import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { getApiUrl } from "@/lib/query-client";
import type { User } from "@shared/schema";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProfileRouteProp = RouteProp<RootStackParamList, "UserProfile">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProfileRouteProp>();
  const queryClient = useQueryClient();

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/users", route.params.userId],
    queryFn: async () => {
      const response = await fetch(
        new URL(`/api/users/${route.params.userId}`, getApiUrl()).toString(),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(
        new URL(`/api/users/${route.params.userId}/block`, getApiUrl()).toString(),
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Failed to block user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      navigation.goBack();
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(
        new URL(`/api/users/${route.params.userId}/report`, getApiUrl()).toString(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason, type: "profile" }),
        }
      );
      if (!response.ok) throw new Error("Failed to report user");
    },
    onSuccess: () => {
      Alert.alert("Report Submitted", "Thank you for helping keep our community safe.");
    },
  });

  const getPhotoSource = useCallback((photo: string) => {
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
  }, []);

  const handleBlock = () => {
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${user?.name}? You won't see each other anymore.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: () => blockMutation.mutate() },
      ]
    );
  };

  const handleReport = () => {
    Alert.alert(
      "Report User",
      "Why are you reporting this profile?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Inappropriate Content", onPress: () => reportMutation.mutate("Inappropriate content") },
        { text: "Spam", onPress: () => reportMutation.mutate("Spam") },
        { text: "Other", onPress: () => reportMutation.mutate("Other") },
      ]
    );
  };

  const handleStartChat = () => {
    if (user) {
      navigation.navigate("Chat", { user });
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ThemedText>User not found</ThemedText>
      </ThemedView>
    );
  }

  const photos = user.photos?.length ? user.photos : ["/avatars/avatar1.png"];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentPhotoIndex(index);
          }}
        >
          {photos.map((photo, index) => (
            <Image
              key={index}
              source={getPhotoSource(photo)}
              style={styles.photo}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {photos.length > 1 && (
          <View style={styles.pagination}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor: index === currentPhotoIndex ? theme.primary : theme.border,
                  },
                ]}
              />
            ))}
          </View>
        )}

        <View style={styles.profileInfo}>
          <ThemedText style={styles.userName}>
            {user.name}{user.age ? `, ${user.age}` : ""}
          </ThemedText>

          {user.nativeLanguage && (
            <View style={styles.languageRow}>
              <Feather name="globe" size={16} color={theme.primary} />
              <ThemedText style={[styles.languages, { color: theme.textSecondary }]}>
                {user.nativeLanguage} {"\u2192"} {(user.learningLanguages || []).join(", ")}
              </ThemedText>
            </View>
          )}

          {user.hobbies && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Hobbies
              </ThemedText>
              <ThemedText style={styles.sectionContent}>{user.hobbies}</ThemedText>
            </View>
          )}

          {user.topics && (
            <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
              <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                Topics of Interest
              </ThemedText>
              <ThemedText style={styles.sectionContent}>{user.topics}</ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot }]}>
        <Pressable
          style={({ pressed }) => [
            styles.startChatButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={handleStartChat}
        >
          <Feather name="message-circle" size={20} color="#FFFFFF" />
          <ThemedText style={styles.startChatText}>Start Chat</ThemedText>
        </Pressable>

        <View style={styles.secondaryActions}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleReport}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
              Report Profile
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleBlock}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: theme.error }]}>
              Block User
            </ThemedText>
          </Pressable>
        </View>
      </View>
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
  photo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.75,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileInfo: {
    paddingHorizontal: Spacing.xl,
  },
  userName: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  languages: {
    ...Typography.body,
  },
  section: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.small,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    ...Typography.body,
  },
  actionBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "transparent",
  },
  startChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  startChatText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  secondaryActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing["3xl"],
    marginTop: Spacing.lg,
  },
  secondaryButton: {
    padding: Spacing.sm,
  },
  secondaryButtonText: {
    ...Typography.small,
  },
});
