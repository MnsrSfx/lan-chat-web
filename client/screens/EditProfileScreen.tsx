import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { HeaderButton } from "@react-navigation/elements";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { LANGUAGES } from "@/constants/languages";
import { getApiUrl } from "@/lib/query-client";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MAX_PHOTOS = 4;

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Spain",
  "France", "Germany", "Italy", "Brazil", "Mexico", "Japan", "China",
  "South Korea", "India", "Russia", "Netherlands", "Sweden", "Poland",
  "Turkey", "Vietnam", "Thailand", "Indonesia", "Philippines", "Argentina",
  "Colombia", "Peru", "Chile", "Portugal", "Belgium", "Switzerland",
  "Austria", "Ireland", "New Zealand", "Singapore", "Malaysia", "Taiwan",
  "Hong Kong", "South Africa", "Egypt", "Morocco", "Nigeria", "Kenya",
  "Saudi Arabia", "United Arab Emirates", "Israel", "Greece", "Czech Republic",
  "Hungary", "Romania", "Ukraine", "Finland", "Norway", "Denmark",
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user, token, updateUser, refreshUser } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [name, setName] = useState(user?.name || "");
  const [age, setAge] = useState(user?.age?.toString() || "");
  const [hobbies, setHobbies] = useState(user?.hobbies || "");
  const [topics, setTopics] = useState(user?.topics || "");
  const [country, setCountry] = useState(user?.country || "");
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const [avatarIndex, setAvatarIndex] = useState(user?.avatarIndex || 0);
  const [nativeLanguage, setNativeLanguage] = useState(user?.nativeLanguage || "");
  const [learningLanguages, setLearningLanguages] = useState<string[]>(user?.learningLanguages || []);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showNativeLanguageModal, setShowNativeLanguageModal] = useState(false);
  const [showLearningLanguageModal, setShowLearningLanguageModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <HeaderButton onPress={() => navigation.goBack()}>
          <ThemedText>Cancel</ThemedText>
        </HeaderButton>
      ),
      headerRight: () => (
        <HeaderButton onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <ThemedText style={{ color: theme.primary, fontWeight: "600" }}>Save</ThemedText>
          )}
        </HeaderButton>
      ),
    });
  }, [navigation, isSaving, name, age, hobbies, topics, country, photos, avatarIndex, nativeLanguage, learningLanguages]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name.");
      return;
    }

    setIsSaving(true);
    try {
      await updateUser({
        name: name.trim(),
        age: age ? parseInt(age, 10) : undefined,
        hobbies: hobbies.trim() || undefined,
        topics: topics.trim() || undefined,
        country: country.trim() || undefined,
        photos,
        avatarIndex,
        nativeLanguage: nativeLanguage || undefined,
        learningLanguages: learningLanguages.length > 0 ? learningLanguages : undefined,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async (index: number) => {
    if (Platform.OS === "web") {
      Alert.alert("Photo Upload", "Photo upload is best experienced in the Expo Go app.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploading(true);
      try {
        const asset = result.assets[0];
        const formData = new FormData();
        const file = new File(asset.uri);
        formData.append("file", file);

        const uploadResponse = await fetch(
          new URL("/api/objects/upload", getApiUrl()).toString(),
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("Upload failed");
        }

        const { path } = await uploadResponse.json();

        const newPhotos = [...photos];
        if (index < photos.length) {
          newPhotos[index] = path;
        } else {
          newPhotos.push(path);
        }
        setPhotos(newPhotos);
        
        await refreshUser();
      } catch (error) {
        Alert.alert("Upload Failed", "Failed to upload photo. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSetAvatar = (index: number) => {
    if (index < photos.length) {
      setAvatarIndex(index);
    }
  };

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

  const toggleLearningLanguage = (lang: string) => {
    if (learningLanguages.includes(lang)) {
      setLearningLanguages(learningLanguages.filter((l) => l !== lang));
    } else if (learningLanguages.length < 3) {
      setLearningLanguages([...learningLanguages, lang]);
    }
  };

  const renderLanguageModal = (
    visible: boolean,
    onClose: () => void,
    selectedValue: string | string[],
    onSelect: (lang: string) => void,
    multiSelect: boolean,
    title: string
  ) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>{title}</ThemedText>
            <Pressable onPress={onClose}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.languageList}>
            {LANGUAGES.map((lang) => {
              const isSelected = multiSelect
                ? (selectedValue as string[]).includes(lang.name)
                : selectedValue === lang.name;
              return (
                <Pressable
                  key={lang.code}
                  style={({ pressed }) => [
                    styles.languageItem,
                    isSelected && { backgroundColor: theme.primary + "20" },
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => onSelect(lang.name)}
                >
                  <ThemedText style={styles.languageItemText}>{lang.name}</ThemedText>
                  {isSelected && <Feather name="check" size={20} color={theme.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
          {multiSelect && (
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.doneButton, { backgroundColor: theme.primary }]}
                onPress={onClose}
              >
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>Done</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Photos
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
          {Array.from({ length: MAX_PHOTOS }).map((_, index) => {
            const photo = photos[index];
            const isAvatar = index === avatarIndex;
            return (
              <View key={index} style={styles.photoContainer}>
                <Pressable
                  style={({ pressed }) => [
                    styles.photoSlot,
                    { backgroundColor: theme.inputBackground, opacity: pressed ? 0.8 : 1 },
                    isAvatar && { borderColor: theme.primary, borderWidth: 2 },
                  ]}
                  onPress={() => (photo ? handleSetAvatar(index) : handlePickImage(index))}
                  onLongPress={() => handlePickImage(index)}
                >
                  {photo ? (
                    <Image source={getPhotoSource(photo)} style={styles.photoImage} />
                  ) : isUploading && index === photos.length ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Feather name="plus" size={32} color={theme.textSecondary} />
                  )}
                </Pressable>
                {isAvatar && photo && (
                  <View style={[styles.avatarBadge, { backgroundColor: theme.primary }]}>
                    <Feather name="star" size={12} color="#FFFFFF" />
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
        <ThemedText style={[styles.photoHint, { color: theme.textSecondary }]}>
          Tap to set as avatar. Long press to change photo.
        </ThemedText>

        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Basic Info
        </ThemedText>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Name</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Age</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            value={age}
            onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ""))}
            placeholder="Your age"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Country</ThemedText>
          <Pressable
            style={({ pressed }) => [
              styles.languageSelector,
              { backgroundColor: theme.inputBackground, opacity: pressed ? 0.8 : 1, marginBottom: 0 },
            ]}
            onPress={() => setShowCountryModal(true)}
          >
            <ThemedText style={{ color: country ? theme.text : theme.textSecondary }}>
              {country || "Select your country"}
            </ThemedText>
            <Feather name="chevron-down" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Languages
        </ThemedText>

        <Pressable
          style={({ pressed }) => [
            styles.languageSelector,
            { backgroundColor: theme.inputBackground, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => setShowNativeLanguageModal(true)}
        >
          <ThemedText style={{ color: nativeLanguage ? theme.text : theme.textSecondary }}>
            {nativeLanguage || "Select native language"}
          </ThemedText>
          <Feather name="chevron-down" size={20} color={theme.textSecondary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.languageSelector,
            { backgroundColor: theme.inputBackground, opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => setShowLearningLanguageModal(true)}
        >
          <View style={{ flex: 1 }}>
            {learningLanguages.length > 0 ? (
              <View style={styles.chipContainer}>
                {learningLanguages.map((lang) => (
                  <View key={lang} style={[styles.chip, { backgroundColor: theme.primary + "20" }]}>
                    <ThemedText style={[styles.chipText, { color: theme.primary }]}>{lang}</ThemedText>
                  </View>
                ))}
              </View>
            ) : (
              <ThemedText style={{ color: theme.textSecondary }}>Select languages to learn</ThemedText>
            )}
          </View>
          <Feather name="chevron-down" size={20} color={theme.textSecondary} />
        </Pressable>

        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          About You
        </ThemedText>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Hobbies</ThemedText>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
            value={hobbies}
            onChangeText={setHobbies}
            placeholder="What do you enjoy doing?"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
            Topics of Interest
          </ThemedText>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.inputBackground, color: theme.text }]}
            value={topics}
            onChangeText={setTopics}
            placeholder="What do you like to talk about?"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </KeyboardAwareScrollViewCompat>

      {renderLanguageModal(
        showNativeLanguageModal,
        () => setShowNativeLanguageModal(false),
        nativeLanguage,
        (lang) => {
          setNativeLanguage(lang);
          setShowNativeLanguageModal(false);
        },
        false,
        "Native Language"
      )}

      {renderLanguageModal(
        showLearningLanguageModal,
        () => setShowLearningLanguageModal(false),
        learningLanguages,
        toggleLearningLanguage,
        true,
        "Languages to Learn (max 3)"
      )}

      <Modal visible={showCountryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Select Country</ThemedText>
              <Pressable onPress={() => setShowCountryModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.languageList}>
              {COUNTRIES.map((c) => {
                const isSelected = country === c;
                return (
                  <Pressable
                    key={c}
                    style={({ pressed }) => [
                      styles.languageItem,
                      isSelected && { backgroundColor: theme.primary + "20" },
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => {
                      setCountry(c);
                      setShowCountryModal(false);
                    }}
                  >
                    <ThemedText style={styles.languageItemText}>{c}</ThemedText>
                    {isSelected ? <Feather name="check" size={20} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
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
  content: {
    paddingHorizontal: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.small,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  photoScroll: {
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  photoContainer: {
    position: "relative",
    marginRight: Spacing.md,
  },
  photoSlot: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  avatarBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  photoHint: {
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.small,
    marginBottom: Spacing.sm,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    ...Typography.body,
  },
  textArea: {
    minHeight: 100,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Typography.body,
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    ...Typography.caption,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  modalTitle: {
    ...Typography.h4,
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  languageItemText: {
    ...Typography.body,
  },
  modalFooter: {
    padding: Spacing.xl,
  },
  doneButton: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
