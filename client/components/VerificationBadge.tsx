import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

type VerificationLevel = "none" | "email" | "photo" | "id";

interface VerificationBadgeProps {
  isVerified: boolean;
  verificationLevel?: VerificationLevel;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

const getBadgeConfig = (level: VerificationLevel) => {
  switch (level) {
    case "id":
      return { icon: "shield" as const, label: "ID Verified", color: "#10B981" };
    case "photo":
      return { icon: "check-circle" as const, label: "Photo Verified", color: "#3B82F6" };
    case "email":
      return { icon: "mail" as const, label: "Email Verified", color: "#8B5CF6" };
    default:
      return null;
  }
};

export function VerificationBadge({
  isVerified,
  verificationLevel = "none",
  size = "small",
  showLabel = false,
}: VerificationBadgeProps) {
  const { theme } = useTheme();

  if (!isVerified || verificationLevel === "none") {
    return null;
  }

  const config = getBadgeConfig(verificationLevel);
  if (!config) return null;

  const iconSize = size === "small" ? 12 : size === "medium" ? 16 : 20;
  const badgeSize = size === "small" ? 18 : size === "medium" ? 24 : 32;

  if (showLabel) {
    return (
      <View
        style={[
          styles.labelBadge,
          { backgroundColor: `${config.color}15` },
        ]}
      >
        <Feather name={config.icon} size={iconSize} color={config.color} />
        <ThemedText style={[styles.labelText, { color: config.color }]}>
          {config.label}
        </ThemedText>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.iconBadge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: config.color,
        },
      ]}
    >
      <Feather name={config.icon} size={iconSize} color="#FFFFFF" />
    </View>
  );
}

export function SafetyIndicator() {
  const { theme } = useTheme();

  return (
    <View style={[styles.safetyContainer, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.safetyHeader}>
        <Feather name="shield" size={18} color={theme.primary} />
        <ThemedText style={[styles.safetyTitle, { color: theme.text }]}>
          Safety Tips
        </ThemedText>
      </View>
      <View style={styles.safetyTips}>
        <View style={styles.tipRow}>
          <Feather name="check" size={14} color="#10B981" />
          <ThemedText style={[styles.tipText, { color: theme.textSecondary }]}>
            Never share personal financial information
          </ThemedText>
        </View>
        <View style={styles.tipRow}>
          <Feather name="check" size={14} color="#10B981" />
          <ThemedText style={[styles.tipText, { color: theme.textSecondary }]}>
            Report suspicious behavior immediately
          </ThemedText>
        </View>
        <View style={styles.tipRow}>
          <Feather name="check" size={14} color="#10B981" />
          <ThemedText style={[styles.tipText, { color: theme.textSecondary }]}>
            Meet in public places for first meetings
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  labelText: {
    ...Typography.small,
    fontWeight: "600",
  },
  safetyContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.lg,
  },
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  safetyTitle: {
    ...Typography.body,
    fontWeight: "600",
  },
  safetyTips: {
    gap: Spacing.sm,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tipText: {
    ...Typography.small,
    flex: 1,
  },
});
