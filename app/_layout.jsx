import React, { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '../context/AuthContext';
import { Colors } from '../constants/colors';
import { restoreSessionFromUrl } from '../services/supabase/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const router = useRouter();
  const linkingUrl = Linking.useURL();
  const handledUrlRef = useRef(null);
  const handledNotificationResponseRef = useRef(null);

  const navigateFromNotification = (response) => {
    const data = response?.notification?.request?.content?.data || {};
    const notificationId = response?.notification?.request?.identifier || null;

    if (!data?.screen || handledNotificationResponseRef.current === notificationId) {
      return;
    }

    handledNotificationResponseRef.current = notificationId;

    if (data.screen === '/chat/directMessage' && data.otherUserId) {
      router.push({
        pathname: '/chat/directMessage',
        params: {
          otherUserId: String(data.otherUserId),
          otherUserName: data.otherUserName || 'User',
          otherUserPhoto: data.otherUserPhoto || '',
        },
      });
    }
  };

  useEffect(() => {
    const processAuthUrl = async (url) => {
      if (!url || handledUrlRef.current === url) return;

      try {
        const restored = await restoreSessionFromUrl(url);
        if (!restored) return;

        handledUrlRef.current = url;
        router.replace('/(tabs)/home');
      } catch (error) {
        handledUrlRef.current = url;
        console.error('[auth] email verification deep link failed:', error);
        router.replace('/profile/login');
      }
    };

    const restoreDeepLinkSession = async () => {
      await processAuthUrl(linkingUrl);

      if (!linkingUrl) {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await processAuthUrl(initialUrl);
        }
      }
    };

    void restoreDeepLinkSession();
  }, [linkingUrl, router]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(response);
    });

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          navigateFromNotification(response);
        }
      })
      .catch((error) => {
        console.error('Failed to handle last notification response:', error);
      });

    return () => {
      subscription.remove();
    };
  }, [router]);

  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.title,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="clubs" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
        <Stack.Screen
          name="createPost"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </AuthProvider>
  );
};

export default RootLayout;
