import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import ThemedText from '../components/ThemedText';

const AuthCallback = () => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <ThemedText style={styles.title}>Finishing email verification...</ThemedText>
      <ThemedText style={styles.subtitle}>You will be taken into the app automatically.</ThemedText>
    </View>
  );
};

export default AuthCallback;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
});
