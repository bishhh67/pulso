import React from 'react';
import { StyleSheet, Switch, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import Spacer from '../../components/Spacer';
import { useColorScheme, Appearance } from 'react-native';
import { Colors } from '../../constants/colors';

const AppSettings = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [notifications, setNotifications] = React.useState(true);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = colorScheme === 'dark' ? 'light' : 'dark';
    Appearance.setColorScheme(newMode);
  };

  return (
    <ThemedView style={styles.container} safe={true}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedButton onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.iconColor} />
        </ThemedButton>
        <ThemedText title style={styles.title}>
          App Settings
        </ThemedText>
      </View>

      <Spacer height={20} />

      {/* Settings Options */}
      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="notifications-outline" size={24} color={theme.iconColor} />
          <ThemedText style={styles.settingText}>Push Notifications</ThemedText>
        </View>
        <Switch
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={notifications ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="moon-outline" size={24} color={theme.iconColor} />
          <ThemedText style={styles.settingText}>Dark Mode</ThemedText>
        </View>
        <Switch
          value={colorScheme === 'dark'}
          onValueChange={toggleDarkMode}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={colorScheme === 'dark' ? '#007AFF' : '#f4f3f4'}
        />
      </View>

      <Spacer height={20} />

      <ThemedButton style={styles.settingButton}>
        <View style={styles.settingLeft}>
          <Ionicons name="language-outline" size={24} color={theme.iconColor} />
          <ThemedText style={styles.settingText}>Language</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.iconColor} />
      </ThemedButton>

      <ThemedButton style={styles.settingButton}>
        <View style={styles.settingLeft}>
          <Ionicons name="lock-closed-outline" size={24} color={theme.iconColor} />
          <ThemedText style={styles.settingText}>Privacy</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.iconColor} />
      </ThemedButton>

      <ThemedButton style={styles.settingButton}>
        <View style={styles.settingLeft}>
          <Ionicons name="download-outline" size={24} color={theme.iconColor} />
          <ThemedText style={styles.settingText}>Data Usage</ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.iconColor} />
      </ThemedButton>

      <Spacer />

      <ThemedText style={styles.version}>Version 1.0.0</ThemedText>
    </ThemedView>
  );
};

export default AppSettings;

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 20,
  },
  
  backButton: {
    padding: 8,
    marginRight: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },

  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  settingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  settingText: {
    fontSize: 16,
  },

  version: {
    textAlign: 'center',
    opacity: 0.5,
    fontSize: 14,
  },
  
});