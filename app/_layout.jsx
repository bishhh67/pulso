import React, { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '../context/AuthContext';
import { Colors } from '../constants/colors';
import { restoreSessionFromUrl } from '../services/supabase/auth';

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const router = useRouter();
  const linkingUrl = Linking.useURL();
  const handledUrlRef = useRef(null);

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
