import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  withSequence,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useCall, type CallStatus } from "@/contexts/CallContext";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { getApiUrl } from "@/lib/query-client";
import type { User } from "@shared/schema";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CallScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { callState, acceptCall, rejectCall, endCall, toggleMute, toggleSpeaker, toggleVideo } = useCall();
  const [callDuration, setCallDuration] = useState(0);

  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (callState.status === 'outgoing' || callState.status === 'incoming') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = 1;
    }
  }, [callState.status]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (callState.status === 'connected' && callState.startTime) {
      interval = setInterval(() => {
        const duration = Math.floor((Date.now() - callState.startTime!.getTime()) / 1000);
        setCallDuration(duration);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [callState.status, callState.startTime]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = (): string => {
    switch (callState.status) {
      case 'outgoing':
        return 'Calling...';
      case 'incoming':
        return 'Incoming Call';
      case 'connected':
        return formatDuration(callDuration);
      default:
        return '';
    }
  };

  const getAvatarSource = useCallback((user: User | null) => {
    if (!user) {
      return require("../../assets/avatars/avatar1.png");
    }
    
    const photos = user.photos || [];
    const avatarIndex = (user as any).avatarIndex || 0;
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

  const renderCallButton = (
    icon: keyof typeof Feather.glyphMap,
    onPress: () => void,
    backgroundColor: string,
    iconColor: string = "#FFFFFF",
    size: number = 60,
    isActive: boolean = false
  ) => (
    <Pressable
      style={({ pressed }) => [
        styles.callButton,
        {
          backgroundColor: isActive ? theme.primary : backgroundColor,
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={onPress}
    >
      <Feather name={icon} size={size * 0.4} color={iconColor} />
    </Pressable>
  );

  if (callState.status === 'idle') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={80} style={StyleSheet.absoluteFill} tint="dark" />
      ) : null}

      <View style={[styles.content, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.userInfo}>
          <Animated.View style={[styles.avatarContainer, pulseStyle]}>
            <Image
              source={getAvatarSource(callState.remoteUser)}
              style={styles.avatar}
            />
            {callState.callType === 'video' && callState.status === 'connected' && (
              <View style={[styles.videoIndicator, { backgroundColor: theme.primary }]}>
                <Feather name="video" size={16} color="#FFFFFF" />
              </View>
            )}
          </Animated.View>

          <ThemedText style={styles.userName}>
            {callState.remoteUser?.name || 'Unknown'}
          </ThemedText>

          <ThemedText style={[styles.callStatus, { color: theme.textSecondary }]}>
            {getStatusText()}
          </ThemedText>

          <View style={styles.callTypeIndicator}>
            <Feather
              name={callState.callType === 'video' ? 'video' : 'phone'}
              size={16}
              color={theme.primary}
            />
            <ThemedText style={[styles.callTypeText, { color: theme.primary }]}>
              {callState.callType === 'video' ? 'Video Call' : 'Voice Call'}
            </ThemedText>
          </View>
        </View>

        {callState.status === 'connected' && (
          <View style={styles.practiceHint}>
            <Feather name="globe" size={20} color={theme.textSecondary} />
            <ThemedText style={[styles.practiceHintText, { color: theme.textSecondary }]}>
              Practice your language skills together
            </ThemedText>
          </View>
        )}

        <View style={styles.controlsContainer}>
          {callState.status === 'connected' && (
            <View style={styles.topControls}>
              {renderCallButton(
                callState.isMuted ? 'mic-off' : 'mic',
                toggleMute,
                theme.cardBackground,
                callState.isMuted ? theme.error : theme.text,
                56,
                callState.isMuted
              )}

              {renderCallButton(
                callState.isSpeakerOn ? 'volume-2' : 'volume-x',
                toggleSpeaker,
                theme.cardBackground,
                callState.isSpeakerOn ? theme.primary : theme.text,
                56,
                callState.isSpeakerOn
              )}

              {callState.callType === 'video' && renderCallButton(
                callState.isVideoEnabled ? 'video' : 'video-off',
                toggleVideo,
                theme.cardBackground,
                callState.isVideoEnabled ? theme.primary : theme.text,
                56,
                callState.isVideoEnabled
              )}
            </View>
          )}

          <View style={styles.mainControls}>
            {callState.status === 'incoming' ? (
              <>
                {renderCallButton('phone', acceptCall, '#34C759', '#FFFFFF', 70)}
                {renderCallButton('x', rejectCall, '#FF3B30', '#FFFFFF', 70)}
              </>
            ) : (
              renderCallButton('phone-off', endCall, '#FF3B30', '#FFFFFF', 70)
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  userInfo: {
    alignItems: 'center',
    paddingTop: Spacing["5xl"],
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  videoIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    ...Typography.h2,
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  callStatus: {
    ...Typography.body,
    marginTop: Spacing.sm,
  },
  callTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
  },
  callTypeText: {
    ...Typography.small,
    fontWeight: '600',
  },
  practiceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
  },
  practiceHintText: {
    ...Typography.small,
  },
  controlsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing["3xl"],
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing["4xl"],
  },
  callButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
