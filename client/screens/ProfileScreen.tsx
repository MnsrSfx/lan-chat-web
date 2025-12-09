import React, { useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { getApiUrl } from "@/lib/query-client";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { notificationsEnabled, requestPermissions, disableNotifications } = useNotifications();

  const getAvatarSource = useCallback(() => {
    if (!user) return require("../../assets/avatars/avatar1.png");
    
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
  }, [user]);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: logout },
      ]
    );
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      if (Platform.OS === "web") {
        Alert.alert("Notifications", "Push notifications are only available in the mobile app. Please use Expo Go on your device.");
        return;
      }
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert("Notifications", "Please enable notifications in your device settings to receive message alerts.");
      }
    } else {
      await disableNotifications();
    }
  };

  const renderSettingsItem = (
    icon: keyof typeof Feather.glyphMap,
    label: string,
    onPress: () => void,
    danger?: boolean
  ) => (
    <Pressable
      style={({ pressed }) => [
        styles.settingsItem,
        { backgroundColor: theme.cardBackground, opacity: pressed ? 0.95 : 1 },
      ]}
      onPress={onPress}
    >
      <Feather name={icon} size={20} color={danger ? theme.error : theme.text} />
      <ThemedText style={[styles.settingsLabel, danger && { color: theme.error }]}>
        {label}
      </ThemedText>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );

  const renderNotificationToggle = () => (
    <View style={[styles.settingsItem, { backgroundColor: theme.cardBackground }]}>
      <Feather name="bell" size={20} color={theme.text} />
      <ThemedText style={styles.settingsLabel}>Notifications</ThemedText>
      <Switch
        value={notificationsEnabled}
        onValueChange={handleNotificationToggle}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={Platform.OS === "android" ? (notificationsEnabled ? theme.primary : theme.textSecondary) : undefined}
      />
    </View>
  );

  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.lg, paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        </View>

        <View style={styles.profileSection}>
          <Image source={getAvatarSource()} style={styles.avatar} />
          <ThemedText style={styles.userName}>
            {user.name}{user.age ? `, ${user.age}` : ""}
          </ThemedText>
          {user.nativeLanguage && (
            <ThemedText style={[styles.languages, { color: theme.textSecondary }]}>
              {user.nativeLanguage} {"\u2192"} {(user.learningLanguages || []).join(", ")}
            </ThemedText>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.editButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Feather name="edit-2" size={18} color="#FFFFFF" />
          <ThemedText style={styles.editButtonText}>Edit Profile</ThemedText>
        </Pressable>

        {(user.hobbies || user.topics) && (
          <View style={[styles.infoSection, { backgroundColor: theme.cardBackground }]}>
            {user.hobbies && (
              <View style={styles.infoItem}>
                <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  Hobbies
                </ThemedText>
                <ThemedText style={styles.infoValue}>{user.hobbies}</ThemedText>
              </View>
            )}
            {user.topics && (
              <View style={styles.infoItem}>
                <ThemedText style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  Topics of Interest
                </ThemedText>
                <ThemedText style={styles.infoValue}>{user.topics}</ThemedText>
              </View>
            )}
          </View>
        )}

        <View style={styles.settingsSection}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Settings
          </ThemedText>
          {renderNotificationToggle()}
          {renderSettingsItem("globe", "Language Preferences", () => {})}
          {renderSettingsItem("shield", "Privacy", () => {})}
          {renderSettingsItem("help-circle", "Help & Support", () => {})}
        </View>

        <View style={styles.settingsSection}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Account
          </ThemedText>
          {renderSettingsItem("log-out", "Log Out", handleLogout, true)}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    ...Typography.h3,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.lg,
  },
  userName: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  languages: {
    ...Typography.body,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
    marginBottom: Spacing["2xl"],
  },
  editButtonText: {
    ...Typography.body,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  infoSection: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.lg,
    marginBottom: Spacing["2xl"],
    gap: Spacing.lg,
  },
  infoItem: {
    gap: Spacing.xs,
  },
  infoLabel: {
    ...Typography.small,
    fontWeight: "500",
  },
  infoValue: {
    ...Typography.body,
  },
  settingsSection: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    ...Typography.small,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: Spacing.md,
    marginLeft: Spacing.sm,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.lg,
  },
  settingsLabel: {
    ...Typography.body,
    flex: 1,
  },
});
