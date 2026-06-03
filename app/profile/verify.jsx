import React, { useRef, useState } from 'react';
import { View, StyleSheet, ImageBackground, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';
import { resendSignupConfirmation } from '../../services/supabase/auth';

const Verify = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const resolvedEmail = String(Array.isArray(email) ? email[0] : email || '').trim();
  const [resending, setResending] = useState(false);
  const resendLockRef = useRef(false);

  const handleResend = async () => {
    if (!resolvedEmail || resendLockRef.current || resending) return;

    resendLockRef.current = true;
    setResending(true);

    try {
      await resendSignupConfirmation(null, resolvedEmail);
      Alert.alert('Email sent', 'We sent another verification email. Please check your inbox.');
    } catch (error) {
      console.error('Resend verification email failed:', error);
      Alert.alert(
        'Could not resend',
        'We could not send the verification email right now. Please try again in a moment.'
      );
    } finally {
      setResending(false);
      resendLockRef.current = false;
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/tree.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']
            : ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.9)']
        }
        style={styles.gradient}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor:
                colorScheme === 'dark'
                  ? 'rgba(20,20,20,0.95)'
                  : 'rgba(255,255,255,0.98)',
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="mail-open-outline" size={64} color="#007AFF" />
          </View>

          <Spacer height={24} />

          <ThemedText title style={styles.title}>
            Check your email
          </ThemedText>

          <Spacer height={16} />

          <ThemedText style={styles.message}>
            Open the signup link sent to:
          </ThemedText>
          <ThemedText style={styles.email}>{resolvedEmail || 'your email'}</ThemedText>

          <Spacer height={12} />

          <ThemedText style={styles.instruction}>
            The link will open this app and sign you in automatically.
          </ThemedText>

          <Spacer height={32} />

          <ThemedButton
            onPress={handleResend}
            disabled={!resolvedEmail || resending}
            style={[styles.button, { backgroundColor: '#007AFF' }]}
          >
            {resending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Resend verification email</ThemedText>
            )}
          </ThemedButton>

          <Spacer height={14} />

          <ThemedButton
            onPress={() => router.replace('/profile/signup')}
            style={[styles.secondaryButton, { backgroundColor: theme.uiBackground }]}
          >
            <ThemedText style={styles.secondaryButtonText}>Back to Signup</ThemedText>
          </ThemedButton>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
};

export default Verify;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    color: '#007AFF',
  },
  instruction: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
