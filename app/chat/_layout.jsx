import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

export default function ChatLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.navBackground },
        headerTintColor: theme.title,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="directMessage"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}