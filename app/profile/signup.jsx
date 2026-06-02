import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
  ImageBackground,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  createUserWithEmailAndPassword,
  requestEmailOtp,
} from '../../services/supabase/auth';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const getSignupErrorMessage = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (code.includes('rate') || message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Please wait 1-2 minutes before trying again.';
  }

  if (code.includes('email') && message.includes('already')) {
    return 'This email is already registered.';
  }

  if (message.includes('password')) {
    return 'Password is too weak. Please choose a stronger password.';
  }

  return 'Failed to create your account. Please try again.';
};

const getOtpErrorMessage = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (code.includes('rate') || message.includes('rate limit') || message.includes('too many')) {
    return 'Account created, but the verification email could not be sent right now. Please wait a minute and try resend from the next screen.';
  }

  return 'Account created, but we could not send the verification email right now.';
};

const SignUp = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const signupRequestLockRef = useRef(false);
  const lastSignupAttemptAtRef = useRef(0);




  
// ONLY CHANGED: lock safety added in early returns

const handleSignUp = async () => {
  if (signupRequestLockRef.current) return;

  signupRequestLockRef.current = true;
  setLoading(true);

  const now = Date.now();
  if (now - lastSignupAttemptAtRef.current < 3000) {
    console.log('[signup] ignored due to debounce');
    signupRequestLockRef.current = false;
    setLoading(false);
    return;
  }

  lastSignupAttemptAtRef.current = now;

  try {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      signupRequestLockRef.current = false;   // FIX
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      signupRequestLockRef.current = false;   // FIX
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      signupRequestLockRef.current = false;   // FIX
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords match.');
      signupRequestLockRef.current = false;   // FIX
      return;
    }

    console.log('SIGNUP CALLED', { email });

    await createUserWithEmailAndPassword(null, email, password);

    Alert.alert(
      'Account Created! 🎉',
      'Now enter the 6-digit code sent to your email.',
      [
        {
          text: 'OK',
          onPress: () =>
            router.push(`/profile/verify?email=${encodeURIComponent(email)}`),
        },
      ]
    );

  } catch (error) {
    console.error('Signup error:', error);
    Alert.alert('Sign Up Failed', getSignupErrorMessage(error));
  } finally {
    setLoading(false);
    signupRequestLockRef.current = false;
  }
};








  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ImageBackground
        source={require('../../assets/tree.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <LinearGradient
          colors={
            colorScheme === 'dark'
              ? ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']
              : ['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.85)']
          }
          style={styles.gradient}
        >
          <View style={styles.headerContainer}>
            <ThemedButton onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color={theme.iconColor} />
            </ThemedButton>
          </View>

          <Spacer height={40} />

          <View style={styles.titleContainer}>
            <ThemedText title style={styles.title}>
              Join Us
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Create your password, then verify with a 6-digit code
            </ThemedText>
          </View>

          <Spacer height={30} />

          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colorScheme === 'dark'
                    ? 'rgba(20,20,20,0.9)'
                    : 'rgba(255,255,255,0.95)',
              },
            ]}
          >
            <ThemedText style={styles.cardTitle}>Create Account</ThemedText>

            <Spacer height={20} />

            <ThemedTextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              textContentType="emailAddress"
            />

            <Spacer height={14} />

            <View style={styles.passwordContainer}>
              <ThemedTextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                textContentType="newPassword"
              />
              <ThemedButton
                onPress={() => setShowPassword((value) => !value)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={theme.iconColor}
                />
              </ThemedButton>
            </View>

            <Spacer height={14} />

            <View style={styles.passwordContainer}>
              <ThemedTextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
                textContentType="newPassword"
              />
              <ThemedButton
                onPress={() => setShowConfirmPassword((value) => !value)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={theme.iconColor}
                />
              </ThemedButton>
            </View>

            <Spacer height={24} />

            <ThemedButton
              onPress={handleSignUp}
              disabled={loading}
              style={[styles.signupButton, { backgroundColor: '#007AFF' }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.signupButtonText}>Create Account</ThemedText>
              )}
            </ThemedButton>

            <Spacer height={16} />

            <View style={styles.loginContainer}>
              <ThemedText style={styles.loginText}>Already have an account? </ThemedText>
              <ThemedButton onPress={() => router.push('/profile/login')}>
                <ThemedText style={styles.loginLink}>Login</ThemedText>
              </ThemedButton>
            </View>
          </View>

          <Spacer height={40} />
        </LinearGradient>
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
};

export default SignUp;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerContainer: {
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    width: '100%',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 8,
  },
  signupButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 14,
    opacity: 0.7,
  },
  loginLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
