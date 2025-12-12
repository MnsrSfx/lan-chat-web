import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useCall } from "@/contexts/CallContext";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import AuthScreen from "@/screens/AuthScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import UserProfileScreen from "@/screens/UserProfileScreen";
import ChatScreen from "@/screens/ChatScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import CallScreen from "@/screens/CallScreen";
import type { User } from "@shared/schema";

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  UserProfile: { userId: string };
  Chat: { user: User };
  EditProfile: undefined;
  PrivacyPolicy: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { callState } = useCall();

  if (isLoading) {
    return null;
  }

  const needsOnboarding = isAuthenticated && user && !user.nativeLanguage;

  return (
    <>
      <Stack.Navigator screenOptions={screenOptions}>
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        ) : needsOnboarding ? (
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="UserProfile"
              component={UserProfileScreen}
              options={{ 
                headerTitle: "Profile",
                presentation: "card",
              }}
            />
            <Stack.Screen
              name="Chat"
              component={ChatScreen}
              options={{ headerTitle: "Chat" }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ 
                headerTitle: "Edit Profile",
                presentation: "modal",
              }}
            />
            <Stack.Screen
              name="PrivacyPolicy"
              component={PrivacyPolicyScreen}
              options={{ 
                headerTitle: "Privacy Policy",
              }}
            />
          </>
        )}
      </Stack.Navigator>
      {callState.status !== 'idle' && <CallScreen />}
    </>
  );
}
