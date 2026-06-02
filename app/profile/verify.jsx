import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ImageBackground,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  auth,
  ensureProfileForUser,
  requestEmailOtp,
  verifyEmailOtp,
} from '../../services/supabase/auth';

import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

const CODE_LENGTH = 6;

const getWaitSeconds = (error) => {
  const message = String(error?.message || '');
  const match = message.match(/(\d+)\s*seconds?/i);
  return match ? Number(match[1]) : 60;
};

const getVerifyErrorMessage = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (code.includes('rate') || message.includes('rate limit') || message.includes('too many')) {
    return {
      title: 'Slow down a bit',
      message: 'Too many attempts. Please wait a minute and try again.',
    };
  }

  if (
    code.includes('expired') ||
    message.includes('expired') ||
    message.includes('otp expired')
  ) {
    return {
      title: 'Code expired',
      message: 'That code expired. Tap resend to get a fresh one.',
    };
  }

  if (
    code.includes('invalid') ||
    message.includes('invalid') ||
    message.includes('otp') ||
    message.includes('token')
  ) {
    return {
      title: 'Invalid code',
      message: 'That code is not valid. Check the latest email and try again.',
    };
  }

  return {
    title: 'Verification failed',
    message: 'We could not verify that code right now. Please try again.',
  };
};

const getSendErrorMessage = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (code.includes('rate') || message.includes('rate limit') || message.includes('too many')) {
    return {
      title: 'Code sent too often',
      message: 'Please wait a minute before requesting another code.',
    };
  }

  if (message.includes('invalid email')) {
    return {
      title: 'Invalid email',
      message: 'Please go back and enter a valid email address.',
    };
  }

  return {
    title: 'Could not resend code',
    message: 'Please try again in a moment.',
  };
};

const Verify = () => {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const codeInputRef = useRef(null);

  const resolvedEmail = String(Array.isArray(email) ? email[0] : email || auth.currentUser?.email || '').trim();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const verifyRequestLockRef = useRef(false);
  const lastVerifyAttemptAtRef = useRef(0);
  const resendRequestLockRef = useRef(false);
  const lastResendAttemptAtRef = useRef(0);

  useEffect(() => {
    codeInputRef.current?.focus?.();
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;

    const interval = setInterval(() => {
      setCooldownSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownSeconds]);



// ONLY CHANGED: added safe lock reset in early exits

const handleVerify = async () => {
  if (verifyRequestLockRef.current) return;

  verifyRequestLockRef.current = true;

  const normalizedCode = String(code || '').replace(/\D/g, '');
  const now = Date.now();

  if (now - lastVerifyAttemptAtRef.current < 3000) {
    console.log('[otp-verify] ignored due to debounce');
    verifyRequestLockRef.current = false; // FIX
    return;
  }
  lastVerifyAttemptAtRef.current = now;

  if (!resolvedEmail) {
    Alert.alert('Missing email', 'We need the email address that received the code.');
    router.replace('/profile/login');
    verifyRequestLockRef.current = false; // FIX
    return;
  }

  if (normalizedCode.length !== CODE_LENGTH) {
    Alert.alert('Incomplete code', 'Enter the 6-digit code from your email.');
    verifyRequestLockRef.current = false; // FIX
    return;
  }

  try {
    setLoading(true);

    console.log('OTP VERIFY CALLED', { email: resolvedEmail });

    const { user } = await verifyEmailOtp(resolvedEmail, normalizedCode);

    if (!user) {
      throw new Error('Verification failed: no user returned');
    }

    try {
      await ensureProfileForUser(user);
    } catch (profileError) {
      console.error('Profile setup after OTP verification failed:', profileError);
    }

    router.replace('/(tabs)/home');

  } catch (error) {
    console.error('Verify OTP error:', error);
    const friendlyError = getVerifyErrorMessage(error);
    Alert.alert(friendlyError.title, friendlyError.message);
  } finally {
    setLoading(false);
    verifyRequestLockRef.current = false;
  }
};






  const handleResendCode = async () => {
    if (!resolvedEmail || resendRequestLockRef.current || resendLoading || cooldownSeconds > 0) return;

    resendRequestLockRef.current = true;

    const now = Date.now();
    if (now - lastResendAttemptAtRef.current < 3000) {
      console.log('[otp-resend] ignored due to debounce');
      resendRequestLockRef.current = false;
      return;
    }
    lastResendAttemptAtRef.current = now;

    try {
      setResendLoading(true);
      console.log('OTP SEND CALLED', { email: resolvedEmail, source: 'resend' });
      await requestEmailOtp(resolvedEmail);
      setCooldownSeconds(60);
      setCode('');
      Alert.alert('Code sent', 'We sent a fresh 6-digit code to your email.');
      codeInputRef.current?.focus?.();
    } catch (error) {
      console.error('Resend OTP error:', error);
      const friendlyError = getSendErrorMessage(error);
      if (friendlyError.title === 'Code sent too often') {
        setCooldownSeconds(getWaitSeconds(error));
      }
      Alert.alert(friendlyError.title, friendlyError.message);
    } finally {
      setResendLoading(false);
      resendRequestLockRef.current = false;
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
            Enter the code
          </ThemedText>

          <Spacer height={16} />

          <ThemedText style={styles.message}>
            We sent a 6-digit code to:
          </ThemedText>

          <ThemedText style={styles.email}>{resolvedEmail || 'your email'}</ThemedText>

          <Spacer height={12} />

          <ThemedText style={styles.instruction}>
            Type the latest code from your inbox to finish signing in.
          </ThemedText>

          <Spacer height={28} />

          <TextInput
            ref={codeInputRef}
            style={[
              styles.codeInput,
              { borderColor: theme.iconColor, color: theme.text },
            ]}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
            keyboardType="number-pad"
            returnKeyType="done"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            placeholder="123456"
            placeholderTextColor={theme.iconColor}
            editable={!loading && !resendLoading}
            textAlign="center"
          />

          <Spacer height={20} />

          <ThemedButton
            onPress={handleVerify}
            disabled={loading || code.replace(/\D/g, '').length !== CODE_LENGTH}
            style={[styles.verifyButton, { backgroundColor: '#007AFF' }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.verifyButtonText}>Verify and continue</ThemedText>
            )}
          </ThemedButton>

          <Spacer height={16} />

          <ThemedButton
            onPress={handleResendCode}
            disabled={resendLoading || cooldownSeconds > 0}
            style={[styles.resendButton, { backgroundColor: theme.uiBackground }]}
          >
            {resendLoading ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <ThemedText style={styles.resendButtonText}>
                {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Send a new code'}
              </ThemedText>
            )}
          </ThemedButton>

          <Spacer height={16} />

          <ThemedButton
            onPress={() => router.replace('/profile/login')}
            style={[styles.backButton, { backgroundColor: theme.uiBackground }]}
          >
            <ThemedText style={styles.backButtonText}>Use a different email</ThemedText>
          </ThemedButton>

          <Spacer height={20} />

          <View style={[styles.infoBox, { backgroundColor: theme.uiBackground }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.iconColor} />
            <ThemedText style={styles.infoText}>
              If the email does not arrive, check spam or request a fresh code.
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
  codeInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 10,
    backgroundColor: 'transparent',
  },
  verifyButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#007AFF',
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
