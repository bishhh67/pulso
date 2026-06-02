import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import DirectMessages from '../../components/chat/DirectMessages';
import ServersList from '../../components/chat/GroupsList';

export default function Chat() {
  const [selectedTab, setSelectedTab] = useState('direct'); // 'direct' or 'servers'
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  return (
    <ThemedView style={styles.container}>
      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: theme.uiBackground }]}>
        <Pressable
          style={[
            styles.tab,
            selectedTab === 'direct' && { borderBottomColor: theme.iconColorFocused, borderBottomWidth: 3 }
          ]}
          onPress={() => setSelectedTab('direct')}
        >
          <ThemedText 
            style={[ 
              styles.tabText,
              { color: selectedTab === 'direct' ? theme.iconColorFocused : theme.iconColor }
            ]}
          >
            Direct Messages
          </ThemedText>
        </Pressable>

        <Pressable
          style={[
            styles.tab,
            selectedTab === 'servers' && { borderBottomColor: theme.iconColorFocused, borderBottomWidth: 3 }
          ]}
          onPress={() => setSelectedTab('servers')}
        >
          <ThemedText 
            style={[
              styles.tabText,
              { color: selectedTab === 'servers' ? theme.iconColorFocused : theme.iconColor }
            ]}
          >
            Servers
          </ThemedText>
        </Pressable>
      </View>

      {/* Content */}
      {selectedTab === 'direct' ? <DirectMessages /> : <ServersList />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
});