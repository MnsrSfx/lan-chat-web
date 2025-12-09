import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { LANGUAGES } from "@/constants/languages";
import { Feather } from "@expo/vector-icons";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { updateUser } = useAuth();

  const [step, setStep] = useState(1);
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [learningLanguages, setLearningLanguages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleLearningLanguage = (language: string) => {
    setLearningLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!nativeLanguage) {
        Alert.alert("Error", "Please select your native language");
        return;
      }
      setStep(2);
    } else {
      if (learningLanguages.length === 0) {
        Alert.alert("Error", "Please select at least one language to learn");
        return;
      }

      setIsLoading(true);
      try {
        await updateUser({ nativeLanguage, learningLanguages });
      } catch (error: any) {
        Alert.alert("Error", error.message || "Failed to save preferences");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, { backgroundColor: theme.primary }]} />
          <View style={[styles.progressLine, { backgroundColor: step === 2 ? theme.primary : theme.border }]} />
          <View style={[styles.progressDot, { backgroundColor: step === 2 ? theme.primary : theme.border }]} />
        </View>
        <ThemedText style={styles.stepText}>Step {step} of 2</ThemedText>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? (
          <>
            <ThemedText style={styles.title}>What is your native language?</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Select the language you speak fluently
            </ThemedText>

            <View style={styles.languageGrid}>
              {LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  style={({ pressed }) => [
                    styles.languageChip,
                    {
                      backgroundColor: nativeLanguage === lang.name ? theme.primary : theme.backgroundSecondary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => setNativeLanguage(lang.name)}
                >
                  <ThemedText
                    style={[
                      styles.languageChipText,
                      { color: nativeLanguage === lang.name ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {lang.name}
                  </ThemedText>
                  {nativeLanguage === lang.name && (
                    <Feather name="check" size={16} color="#FFFFFF" style={styles.checkIcon} />
                  )}
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <ThemedText style={styles.title}>What languages do you want to learn?</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
              Select one or more languages
            </ThemedText>

            <View style={styles.languageGrid}>
              {LANGUAGES.filter(l => l.name !== nativeLanguage).map((lang) => (
                <Pressable
                  key={lang.code}
                  style={({ pressed }) => [
                    styles.languageChip,
                    {
                      backgroundColor: learningLanguages.includes(lang.name) ? theme.primary : theme.backgroundSecondary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => toggleLearningLanguage(lang.name)}
                >
                  <ThemedText
                    style={[
                      styles.languageChipText,
                      { color: learningLanguages.includes(lang.name) ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {lang.name}
                  </ThemedText>
                  {learningLanguages.includes(lang.name) && (
                    <Feather name="check" size={16} color="#FFFFFF" style={styles.checkIcon} />
                  )}
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: theme.backgroundRoot }]}>
        {step === 2 && (
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              { borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => setStep(1)}
          >
            <ThemedText style={{ color: theme.text }}>Back</ThemedText>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1, flex: step === 2 ? 1 : undefined },
          ]}
          onPress={handleNext}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.nextButtonText}>
              {step === 1 ? "Continue" : "Get Started"}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressLine: {
    width: 60,
    height: 2,
    marginHorizontal: Spacing.xs,
  },
  stepText: {
    ...Typography.small,
    color: "#757575",
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  title: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    marginBottom: Spacing.xl,
  },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  languageChipText: {
    ...Typography.body,
  },
  checkIcon: {
    marginLeft: Spacing.xs,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  backButton: {
    height: Spacing.buttonHeight,
    paddingHorizontal: Spacing["2xl"],
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  nextButton: {
    height: Spacing.buttonHeight,
    paddingHorizontal: Spacing["3xl"],
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "#FFFFFF",
    ...Typography.body,
    fontWeight: "600",
  },
});
