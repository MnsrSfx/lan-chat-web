import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
  RefreshControl,
  TextInput,
  ScrollView,
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
import type { User } from "@shared/schema";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Chinese", "Japanese", "Korean", "Arabic", "Russian", "Hindi",
  "Dutch", "Swedish", "Polish", "Turkish", "Vietnamese", "Thai",
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Spain",
  "France", "Germany", "Italy", "Brazil", "Mexico", "Japan", "China",
  "South Korea", "India", "Russia", "Netherlands", "Sweden", "Poland",
  "Turkey", "Vietnam", "Thailand", "Indonesia", "Philippines", "Argentina",
];

interface AdvancedFilters {
  nativeLanguage: string;
  learningLanguage: string;
  country: string;
  hobbies: string;
  topics: string;
  minAge: number;
  maxAge: number;
}

const defaultFilters: AdvancedFilters = {
  nativeLanguage: "",
  learningLanguage: "",
  country: "",
  hobbies: "",
  topics: "",
  minAge: 18,
  maxAge: 65,
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { token } = useAuth();
  const { isUserOnline } = usePresence();
  const navigation = useNavigation<NavigationProp>();

  const [filter, setFilter] = useState<"all" | "new" | "online">("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(defaultFilters);
  const [tempFilters, setTempFilters] = useState<AdvancedFilters>(defaultFilters);

  const hasActiveFilters = useMemo(() => {
    return (
      advancedFilters.nativeLanguage !== "" ||
      advancedFilters.learningLanguage !== "" ||
      advancedFilters.country !== "" ||
      advancedFilters.hobbies !== "" ||
      advancedFilters.topics !== "" ||
      advancedFilters.minAge !== 18 ||
      advancedFilters.maxAge !== 65
    );
  }, [advancedFilters]);

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filter === "online") params.append("online", "true");
    if (filter === "new") params.append("newMembers", "true");
    if (advancedFilters.minAge > 18) params.append("minAge", advancedFilters.minAge.toString());
    if (advancedFilters.maxAge < 65) params.append("maxAge", advancedFilters.maxAge.toString());
    if (advancedFilters.nativeLanguage) params.append("nativeLanguage", advancedFilters.nativeLanguage);
    if (advancedFilters.learningLanguage) params.append("learningLanguage", advancedFilters.learningLanguage);
    if (advancedFilters.country) params.append("country", advancedFilters.country);
    if (advancedFilters.hobbies) params.append("hobbies", advancedFilters.hobbies);
    if (advancedFilters.topics) params.append("topics", advancedFilters.topics);
    return params.toString();
  }, [filter, advancedFilters]);

  const { data: users = [], isLoading, refetch, isRefetching } = useQuery<User[]>({
    queryKey: ["/api/users", filter, JSON.stringify(advancedFilters)],
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

  const openAdvancedFilters = useCallback(() => {
    setTempFilters({ ...advancedFilters });
    setShowAdvancedFilters(true);
  }, [advancedFilters]);

  const applyFilters = useCallback(() => {
    setAdvancedFilters({ ...tempFilters });
    setShowAdvancedFilters(false);
  }, [tempFilters]);

  const resetFilters = useCallback(() => {
    setTempFilters({ ...defaultFilters });
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
          {(isUserOnline(item.id) || item.isOnline) && <View style={[styles.onlineIndicator, { backgroundColor: theme.online }]} />}
        </View>

        <View style={styles.userInfo}>
          <ThemedText style={styles.userName}>
            {item.name}{item.age ? `, ${item.age}` : ""}
          </ThemedText>
          <ThemedText style={[styles.userLanguages, { color: theme.textSecondary }]}>
            {item.nativeLanguage} {"\u2192"} {(item.learningLanguages || []).join(", ")}
          </ThemedText>
          {item.country ? (
            <ThemedText style={[styles.userCountry, { color: theme.textSecondary }]}>
              {item.country}
            </ThemedText>
          ) : null}
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

  const renderSelectOption = (
    value: string,
    options: string[],
    onChange: (val: string) => void,
    placeholder: string
  ) => (
    <View style={styles.selectContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsRow}>
        <Pressable
          style={[
            styles.optionChip,
            { backgroundColor: value === "" ? theme.primary : theme.backgroundSecondary },
          ]}
          onPress={() => onChange("")}
        >
          <ThemedText style={[styles.optionChipText, { color: value === "" ? "#FFFFFF" : theme.text }]}>
            {placeholder}
          </ThemedText>
        </Pressable>
        {options.map((opt) => (
          <Pressable
            key={opt}
            style={[
              styles.optionChip,
              { backgroundColor: value === opt ? theme.primary : theme.backgroundSecondary },
            ]}
            onPress={() => onChange(opt)}
          >
            <ThemedText style={[styles.optionChipText, { color: value === opt ? "#FFFFFF" : theme.text }]}>
              {opt}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <ThemedText style={styles.headerTitle}>Community</ThemedText>
        <Pressable
          style={({ pressed }) => [
            styles.filterButton,
            { 
              backgroundColor: hasActiveFilters ? theme.primary : theme.backgroundSecondary, 
              opacity: pressed ? 0.8 : 1 
            },
          ]}
          onPress={openAdvancedFilters}
        >
          <Feather name="sliders" size={20} color={hasActiveFilters ? "#FFFFFF" : theme.text} />
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
              {hasActiveFilters ? (
                <Pressable
                  style={[styles.clearFiltersButton, { borderColor: theme.primary }]}
                  onPress={() => setAdvancedFilters(defaultFilters)}
                >
                  <ThemedText style={{ color: theme.primary }}>Clear Filters</ThemedText>
                </Pressable>
              ) : null}
            </View>
          }
        />
      )}

      <Modal visible={showAdvancedFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Advanced Filters</ThemedText>
              <Pressable onPress={() => setShowAdvancedFilters(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.filtersScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <ThemedText style={[styles.filterLabel, { color: theme.textSecondary }]}>
                  Native Language
                </ThemedText>
                {renderSelectOption(
                  tempFilters.nativeLanguage,
                  LANGUAGES,
                  (val) => setTempFilters({ ...tempFilters, nativeLanguage: val }),
                  "Any"
                )}
              </View>

              <View style={styles.filterSection}>
                <ThemedText style={[styles.filterLabel, { color: theme.textSecondary }]}>
                  Learning Language
                </ThemedText>
                {renderSelectOption(
                  tempFilters.learningLanguage,
                  LANGUAGES,
                  (val) => setTempFilters({ ...tempFilters, learningLanguage: val }),
                  "Any"
                )}
              </View>

              <View style={styles.filterSection}>
                <ThemedText style={[styles.filterLabel, { color: theme.textSecondary }]}>
                  Country
                </ThemedText>
                {renderSelectOption(
                  tempFilters.country,
                  COUNTRIES,
                  (val) => setTempFilters({ ...tempFilters, country: val }),
                  "Any"
                )}
              </View>

              <View style={styles.filterSection}>
                <ThemedText style={[styles.filterLabel, { color: theme.textSecondary }]}>
                  Hobbies
                </ThemedText>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  placeholder="Search by hobbies..."
                  placeholderTextColor={theme.textSecondary}
                  value={tempFilters.hobbies}
                  onChangeText={(val) => setTempFilters({ ...tempFilters, hobbies: val })}
                />
              </View>

              <View style={styles.filterSection}>
                <ThemedText style={[styles.filterLabel, { color: theme.textSecondary }]}>
                  Topics
                </ThemedText>
                <TextInput
                  style={[styles.textInput, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                  placeholder="Search by topics..."
                  placeholderTextColor={theme.textSecondary}
                  value={tempFilters.topics}
                  onChangeText={(val) => setTempFilters({ ...tempFilters, topics: val })}
                />
              </View>

              <View style={styles.filterSection}>
                <ThemedText style={[styles.filterLabel, { color: theme.textSecondary }]}>
                  Age Range: {tempFilters.minAge} - {tempFilters.maxAge}
                </ThemedText>

                <View style={styles.ageButtons}>
                  <View style={styles.ageButtonGroup}>
                    <ThemedText style={{ color: theme.textSecondary }}>Min:</ThemedText>
                    <Pressable
                      style={[styles.ageAdjustButton, { backgroundColor: theme.backgroundSecondary }]}
                      onPress={() => setTempFilters({ ...tempFilters, minAge: Math.max(18, tempFilters.minAge - 1) })}
                    >
                      <Feather name="minus" size={16} color={theme.text} />
                    </Pressable>
                    <ThemedText style={styles.ageValue}>{tempFilters.minAge}</ThemedText>
                    <Pressable
                      style={[styles.ageAdjustButton, { backgroundColor: theme.backgroundSecondary }]}
                      onPress={() => setTempFilters({ ...tempFilters, minAge: Math.min(tempFilters.maxAge - 1, tempFilters.minAge + 1) })}
                    >
                      <Feather name="plus" size={16} color={theme.text} />
                    </Pressable>
                  </View>

                  <View style={styles.ageButtonGroup}>
                    <ThemedText style={{ color: theme.textSecondary }}>Max:</ThemedText>
                    <Pressable
                      style={[styles.ageAdjustButton, { backgroundColor: theme.backgroundSecondary }]}
                      onPress={() => setTempFilters({ ...tempFilters, maxAge: Math.max(tempFilters.minAge + 1, tempFilters.maxAge - 1) })}
                    >
                      <Feather name="minus" size={16} color={theme.text} />
                    </Pressable>
                    <ThemedText style={styles.ageValue}>{tempFilters.maxAge}</ThemedText>
                    <Pressable
                      style={[styles.ageAdjustButton, { backgroundColor: theme.backgroundSecondary }]}
                      onPress={() => setTempFilters({ ...tempFilters, maxAge: Math.min(65, tempFilters.maxAge + 1) })}
                    >
                      <Feather name="plus" size={16} color={theme.text} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + Spacing.lg }]}>
              <Pressable
                style={[styles.resetButton, { borderColor: theme.border }]}
                onPress={resetFilters}
              >
                <ThemedText>Reset</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.applyButton, { backgroundColor: theme.primary }]}
                onPress={applyFilters}
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
  userCountry: {
    ...Typography.small,
    marginTop: 2,
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
  clearFiltersButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h4,
  },
  filtersScrollView: {
    paddingHorizontal: Spacing.xl,
  },
  filterSection: {
    marginBottom: Spacing.xl,
  },
  filterLabel: {
    ...Typography.small,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  selectContainer: {
    marginTop: Spacing.xs,
  },
  optionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: Spacing.xl,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  optionChipText: {
    ...Typography.small,
  },
  textInput: {
    height: 44,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  ageButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.md,
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
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
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
