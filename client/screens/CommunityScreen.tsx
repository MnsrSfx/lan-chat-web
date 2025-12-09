import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
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
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { getApiUrl } from "@/lib/query-client";
import type { User } from "@shared/schema";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { token } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [filter, setFilter] = useState<"all" | "new" | "online">("all");
  const [showAgeFilter, setShowAgeFilter] = useState(false);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(65);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (filter === "online") params.append("online", "true");
    if (filter === "new") params.append("newMembers", "true");
    if (minAge > 18) params.append("minAge", minAge.toString());
    if (maxAge < 65) params.append("maxAge", maxAge.toString());
    return params.toString();
  };

  const { data: users = [], isLoading, refetch, isRefetching } = useQuery<User[]>({
    queryKey: ["/api/users", filter, minAge, maxAge],
    queryFn: async () => {
      const queryParams = buildQueryParams();
      const url = new URL(`/api/users${queryParams ? `?${queryParams}` : ""}`, getApiUrl());
      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
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

  const renderUser = ({ item }: { item: User }) => (
    <Pressable
      style={({ pressed }) => [
        styles.userCard,
        { backgroundColor: theme.cardBackground, opacity: pressed ? 0.95 : 1 },
      ]}
      onPress={() => navigation.navigate("UserProfile", { userId: item.id })}
    >
      <View style={styles.userCardContent}>
        <View style={styles.avatarContainer}>
          <Image source={getAvatarSource(item)} style={styles.avatar} />
          {item.isOnline && <View style={[styles.onlineIndicator, { backgroundColor: theme.online }]} />}
        </View>

        <View style={styles.userInfo}>
          <ThemedText style={styles.userName}>
            {item.name}{item.age ? `, ${item.age}` : ""}
          </ThemedText>
          <ThemedText style={[styles.userLanguages, { color: theme.textSecondary }]}>
            {item.nativeLanguage} {"\u2192"} {(item.learningLanguages || []).join(", ")}
          </ThemedText>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.chatButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("Chat", { user: item });
          }}
        >
          <Feather name="message-circle" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <ThemedText style={styles.headerTitle}>Community</ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.filterButton,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => setShowAgeFilter(true)}
        >
          <Feather name="sliders" size={20} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.filterBar}>
        {(["all", "new", "online"] as const).map((f) => (
          <Pressable
            key={f}
            style={({ pressed }) => [
              styles.filterChip,
              {
                backgroundColor: filter === f ? theme.primary : theme.backgroundSecondary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => setFilter(f)}
          >
            <ThemedText
              style={[styles.filterChipText, { color: filter === f ? "#FFFFFF" : theme.text }]}
            >
              {f === "all" ? "All Members" : f === "new" ? "New Members" : "Online"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + Spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={theme.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="users" size={48} color={theme.textSecondary} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No users found
              </ThemedText>
            </View>
          }
        />
      )}

      <Modal visible={showAgeFilter} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Age Filter</ThemedText>
              <Pressable onPress={() => setShowAgeFilter(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.ageFilterContent}>
              <ThemedText style={[styles.ageLabel, { color: theme.textSecondary }]}>
                Age Range: {minAge} - {maxAge}
              </ThemedText>

              <View style={styles.sliderContainer}>
                <ThemedText style={{ color: theme.textSecondary }}>18</ThemedText>
                <View style={[styles.sliderTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.sliderFill,
                      {
                        backgroundColor: theme.primary,
                        left: `${((minAge - 18) / 47) * 100}%`,
                        right: `${((65 - maxAge) / 47) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={{ color: theme.textSecondary }}>65</ThemedText>
              </View>

              <View style={styles.ageButtons}>
                <View style={styles.ageButtonGroup}>
                  <ThemedText style={{ color: theme.textSecondary }}>Min:</ThemedText>
                  <Pressable
                    style={[styles.ageAdjustButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => setMinAge(Math.max(18, minAge - 1))}
                  >
                    <Feather name="minus" size={16} color={theme.text} />
                  </Pressable>
                  <ThemedText style={styles.ageValue}>{minAge}</ThemedText>
                  <Pressable
                    style={[styles.ageAdjustButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => setMinAge(Math.min(maxAge - 1, minAge + 1))}
                  >
                    <Feather name="plus" size={16} color={theme.text} />
                  </Pressable>
                </View>

                <View style={styles.ageButtonGroup}>
                  <ThemedText style={{ color: theme.textSecondary }}>Max:</ThemedText>
                  <Pressable
                    style={[styles.ageAdjustButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => setMaxAge(Math.max(minAge + 1, maxAge - 1))}
                  >
                    <Feather name="minus" size={16} color={theme.text} />
                  </Pressable>
                  <ThemedText style={styles.ageValue}>{maxAge}</ThemedText>
                  <Pressable
                    style={[styles.ageAdjustButton, { backgroundColor: theme.backgroundSecondary }]}
                    onPress={() => setMaxAge(Math.min(65, maxAge + 1))}
                  >
                    <Feather name="plus" size={16} color={theme.text} />
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.resetButton, { borderColor: theme.border }]}
                onPress={() => {
                  setMinAge(18);
                  setMaxAge(65);
                }}
              >
                <ThemedText>Reset</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.applyButton, { backgroundColor: theme.primary }]}
                onPress={() => setShowAgeFilter(false)}
              >
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>Apply</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.h3,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterChipText: {
    ...Typography.small,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  userCard: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
  },
  userCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  userName: {
    ...Typography.body,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  userLanguages: {
    ...Typography.small,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: Spacing["5xl"],
  },
  emptyText: {
    marginTop: Spacing.lg,
    ...Typography.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.h4,
  },
  ageFilterContent: {
    marginBottom: Spacing.xl,
  },
  ageLabel: {
    ...Typography.body,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    position: "relative",
  },
  sliderFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  ageButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  ageButtonGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  ageAdjustButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ageValue: {
    ...Typography.body,
    fontWeight: "600",
    minWidth: 30,
    textAlign: "center",
  },
  modalFooter: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  resetButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  applyButton: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
