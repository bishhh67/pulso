import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, ImageBackground } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { auth, sendEmailVerification, reload } from '../../services/supabase/auth';

import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

const Verify = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const user = auth.currentUser;
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      await reload();
      if (auth.currentUser?.emailVerified) {
        clearInterval(interval);
        Alert.alert('Email Verified! ✅', 'You can now login to your account.');
        router.replace('/profile/login');
      }
    }, 5000);

    setTimeout(() => setChecking(false), 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;

    const interval = setInterval(() => {
      setCooldownSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const getCooldownSeconds = (error) => {
    const message = String(error?.message || '');
    const match = message.match(/(\d+)\s*seconds?/i);
    return match ? Number(match[1]) : 60;
  };

  const resendEmail = async () => {
    if (cooldownSeconds > 0) return;

    try {
      setLoading(true);
      await sendEmailVerification({ email: user?.email || email });
      Alert.alert('Email Sent', 'Verification link has been resent to your email.');
    } catch (error) {
      console.error('Resend error:', error);
      if (String(error?.message || '').includes('For security purposes')) {
        const waitSeconds = getCooldownSeconds(error);
        setCooldownSeconds(waitSeconds);
        Alert.alert(
          'Please wait',
          `Supabase asked us to wait ${waitSeconds} seconds before sending another verification email.`
        );
      } else {
        Alert.alert('Error', 'Failed to send verification email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.replace('/profile/login');
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
        <View style={[
          styles.container,
          { backgroundColor: colorScheme === 'dark' ? 'rgba(20,20,20,0.95)' : 'rgba(255,255,255,0.98)' }
        ]}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="mail-outline" size={64} color="#007AFF" />
          </View>

          <Spacer height={24} />

          {/* Title */}
          <ThemedText title style={styles.title}>
            Verify Your Email
          </ThemedText>

          <Spacer height={16} />

          {/* Message */}
          <ThemedText style={styles.message}>
            We've sent a verification link to:
          </ThemedText>
          <ThemedText style={styles.email}>
            {user?.email || email || 'your email'}
          </ThemedText>

          <Spacer height={12} />

          <ThemedText style={styles.instruction}>
            Please check your inbox and click the verification link to continue.
          </ThemedText>

          <Spacer height={32} />

          {/* Checking Status */}
          {checking ? (
            <View style={styles.checkingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Spacer height={12} />
              <ThemedText style={styles.checkingText}>
                Checking verification status...
              </ThemedText>
            </View>
          ) : (
            <View style={styles.autoCheckInfo}>
              <Ionicons name="refresh-circle-outline" size={20} color={theme.iconColor} />
              <ThemedText style={styles.autoCheckText}>
                Auto-checking every 5 seconds
              </ThemedText>
            </View>
          )}

          <Spacer height={32} />

          {/* Resend Button */}
          <ThemedButton 
            onPress={resendEmail}
            disabled={loading || cooldownSeconds > 0}
            style={[styles.resendButton, { backgroundColor: '#007AFF' }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.resendButtonText}>
                {cooldownSeconds > 0
                  ? `Resend in ${cooldownSeconds}s`
                  : 'Resend Verification Email'}
              </ThemedText>
            )}
          </ThemedButton>

          <Spacer height={16} />

          {/* Back to Login */}
          <ThemedButton 
            onPress={handleBackToLogin}
            style={[styles.backButton, { backgroundColor: theme.uiBackground }]}
          >
            <ThemedText style={styles.backButtonText}>
              Back to Login
            </ThemedText>
          </ThemedButton>

          <Spacer height={24} />

          {/* Info Box */}
          <View style={[styles.infoBox, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.iconColor} />
            <ThemedText style={styles.infoText}>
              Check your spam folder if you don't see the email in your inbox.
            </ThemedText>
          </View>
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
    maxWidth: 400,
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
  checkingContainer: {
    alignItems: 'center',
  },
  checkingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  autoCheckInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoCheckText: {
    fontSize: 13,
    opacity: 0.6,
  },
  resendButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
    lineHeight: 16,
  },
});
