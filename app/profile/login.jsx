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
  signInWithEmailAndPassword,
} from '../../services/supabase/auth';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

const Login = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginRequestLockRef = useRef(false);
  const lastLoginAttemptAtRef = useRef(0);

  const handleLogin = async () => {
    if (loginRequestLockRef.current) return;

    loginRequestLockRef.current = true;
    setLoading(true);

    const now = Date.now();
    if (now - lastLoginAttemptAtRef.current < 3000) {
      loginRequestLockRef.current = false;
      setLoading(false);
      return;
    }
    lastLoginAttemptAtRef.current = now;

    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      loginRequestLockRef.current = false;
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters.');
      loginRequestLockRef.current = false;
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(null, email, password);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Login error:', error);

      let errorMessage = 'Login failed. Please try again.';
      const errorCode = String(error?.code || '').toLowerCase();
      const message = String(error?.message || '').toLowerCase();

      if (errorCode.includes('invalid') && errorCode.includes('login')) {
        errorMessage = 'Invalid email or password.';
      } else if (errorCode.includes('user-not-found')) {
        errorMessage = 'No account found with this email.';
      } else if (errorCode.includes('wrong-password')) {
        errorMessage = 'Incorrect password.';
      } else if (message.includes('invalid login credentials')) {
        errorMessage = 'Incorrect email or password.';
      } else if (message.includes('verify your email') || message.includes('email not confirmed')) {
        errorMessage = 'Please verify your email before logging in.';
      } else if (message.includes('rate limit') || message.includes('too many')) {
        errorMessage = 'Too many failed attempts. Try again later.';
      }

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
      loginRequestLockRef.current = false;
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

          <Spacer height={60} />

          <View style={styles.titleContainer}>
            <ThemedText title style={styles.title}>Pulchowk Campus</ThemedText>
            <ThemedText style={styles.subtitle}>Sign in to continue</ThemedText>
          </View>

          <Spacer height={40} />

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
            <ThemedText style={styles.cardTitle}>Welcome Back</ThemedText>

            <Spacer height={24} />

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

            <Spacer height={16} />

            <View style={styles.passwordContainer}>
              <ThemedTextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                textContentType="password"
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

            <Spacer height={24} />

            <ThemedButton
              onPress={handleLogin}
              disabled={loading}
              style={[styles.loginButton, { backgroundColor: '#007AFF' }]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText style={styles.loginButtonText}>Login</ThemedText>
              )}
            </ThemedButton>

            <Spacer height={16} />

            <View style={styles.signupContainer}>
              <ThemedText style={styles.signupText}>Don&apos;t have an account? </ThemedText>
              <ThemedButton onPress={() => router.push('/profile/signup')}>
                <ThemedText style={styles.signupLink}>Sign Up</ThemedText>
              </ThemedButton>
            </View>
          </View>

          <Spacer height={40} />
        </LinearGradient>
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
};

export default Login;

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
    padding: 28,
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
  loginButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupText: {
    fontSize: 14,
    opacity: 0.7,
  },
  signupLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
