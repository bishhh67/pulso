import React, { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { Colors } from '../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { supabase } from '../services/supabase/client';

const extractAuthParams = (url) => {
  if (!url) return {};

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {};
  }

  const queryParams = Object.fromEntries(parsedUrl.searchParams.entries());
  const hashParams = parsedUrl.hash
    ? Object.fromEntries(new URLSearchParams(parsedUrl.hash.slice(1)).entries())
    : {};

  return { ...hashParams, ...queryParams };
};

const restoreSessionFromUrl = async (url) => {
  const params = extractAuthParams(url);
  const code = params.code;
  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  const tokenHash = params.token_hash;
  const otpType = params.type || 'email';

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return;
  }

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) throw error;
  }
};

const RootLayout = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const handledUrlRef = useRef(null);
  const linkingUrl = Linking.useLinkingURL();

  useEffect(() => {
    const processUrl = async (url) => {
      if (!url || handledUrlRef.current === url) return;
      handledUrlRef.current = url;

      const params = extractAuthParams(url);
      const looksLikeAuthCallback =
        url.includes('access_token=') ||
        url.includes('refresh_token=') ||
        url.includes('code=') ||
        url.includes('token_hash=');

      if (!looksLikeAuthCallback) return;

      try {
        await restoreSessionFromUrl(url);
        console.log('[auth] deep link session restored', {
          hasCode: !!params.code,
          hasAccessToken: !!params.access_token,
        });
      } catch (error) {
        console.error('[auth] deep link restore failed:', error);
      }
    };

    void processUrl(linkingUrl);
  }, [linkingUrl]);

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
