import React, { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { getApiUrl } from '@/lib/query-client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  notificationsEnabled: boolean;
  requestPermissions: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATIONS_ENABLED_KEY = '@lanchat_notifications_enabled';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const tokenRef = useRef<string | null>(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    loadNotificationPreference();

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.type === 'new_message' && data?.senderId) {
        // Navigation can be handled by the app
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const loadNotificationPreference = async () => {
    try {
      const enabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      if (enabled === 'true') {
        setNotificationsEnabled(true);
      }
    } catch (error) {
      console.error('Failed to load notification preference:', error);
    }
  };

  const savePushTokenToServer = useCallback(async (pushToken: string) => {
    const authToken = tokenRef.current;
    if (!authToken) return;
    
    try {
      const response = await fetch(new URL('/api/push-token', getApiUrl()).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pushToken }),
      });

      if (!response.ok) {
        console.error('Failed to save push token to server');
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }, []);

  const deletePushTokenFromServer = useCallback(async () => {
    const authToken = tokenRef.current;
    if (!authToken) return;
    
    try {
      await fetch(new URL('/api/push-token', getApiUrl()).toString(), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    } catch (error) {
      console.error('Error deleting push token:', error);
    }
  }, []);

  const registerForPushNotifications = useCallback(async () => {
    if (Platform.OS === 'web') {
      return;
    }

    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission not granted');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const pushToken = tokenData.data;
      setExpoPushToken(pushToken);

      if (tokenRef.current && pushToken) {
        await savePushTokenToServer(pushToken);
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366f1',
        });
      }
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
    }
  }, [savePushTokenToServer]);

  useEffect(() => {
    if (isAuthenticated && notificationsEnabled) {
      registerForPushNotifications();
    }
  }, [isAuthenticated, notificationsEnabled, registerForPushNotifications]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return false;
    }

    if (!Device.isDevice) {
      return false;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        setNotificationsEnabled(true);
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');
        await registerForPushNotifications();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  }, [registerForPushNotifications]);

  const disableNotifications = useCallback(async () => {
    setNotificationsEnabled(false);
    setExpoPushToken(null);
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
    await deletePushTokenFromServer();
  }, [deletePushTokenFromServer]);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        notificationsEnabled,
        requestPermissions,
        disableNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
