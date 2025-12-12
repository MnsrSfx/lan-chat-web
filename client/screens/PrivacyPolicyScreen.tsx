import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Typography } from "@/constants/theme";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.lastUpdated}>Last Updated: December 2025</ThemedText>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>1. Information We Collect</ThemedText>
          <ThemedText style={[styles.text, { color: theme.textSecondary }]}>
            We collect information you provide directly to us, including your name, email address, profile information, language preferences, and messages you send through the app. We also collect device information and usage data to improve our services.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>2. How We Use Your Information</ThemedText>
          <ThemedText style={[styles.text, { color: theme.textSecondary }]}>
            We use the information we collect to provide, maintain, and improve our services, to communicate with you, to match you with language partners, and to send you notifications about messages and app updates.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>3. Information Sharing</ThemedText>
          <ThemedText style={[styles.text, { color: theme.textSecondary }]}>
            Your profile information is visible to other users of the app. We do not sell your personal information to third parties. We may share information with service providers who assist us in operating our services.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>4. Data Security</ThemedText>
          <ThemedText style={[styles.text, { color: theme.textSecondary }]}>
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>5. Your Rights</ThemedText>
          <ThemedText style={[styles.text, { color: theme.textSecondary }]}>
            You have the right to access, update, or delete your personal information at any time through your account settings. You can also disable notifications through the app settings.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>6. Children's Privacy</ThemedText>
          <ThemedText style={[styles.text, { color: theme.textSecondary }]}>
            Our services are not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>7. Changes to This Policy</ThemedText>
          <ThemedText style={[styles.text, { color: theme.textSecondary }]}>
            We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>8. Contact Us</ThemedText>
          <ThemedText style={[styles.text, { color: theme.textSecondary }]}>
            If you have any questions about this Privacy Policy, please contact us through the Help & Support section in the app.
          </ThemedText>
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
    padding: Spacing.xl,
  },
  lastUpdated: {
    ...Typography.small,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  text: {
    ...Typography.body,
    lineHeight: 24,
  },
});
