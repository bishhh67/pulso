import React from 'react'
import { Stack } from 'expo-router'
import { Colors } from '../../constants/colors'
import { useColorScheme } from 'react-native'

export default function ClubsLayout() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.navBackground },
        headerTintColor: theme.title,
        headerBackTitleVisible: false, // removes the back button text
        headerTitle: '',               // removes the title
      }}
    >
      <Stack.Screen name="[clubId]" />
    </Stack>
  )
}
