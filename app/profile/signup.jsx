import React, { useRef, useState } from 'react';
import { StyleSheet, TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator, ImageBackground, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { auth, createUserWithEmailAndPassword } from '../../services/supabase/auth';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/colors';

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

  const handleSignUp = async () => {
    if (loading || signupRequestLockRef.current) return;

    const now = Date.now();
    if (now - lastSignupAttemptAtRef.current < 3000) {
      console.log('[signup] ignored due to debounce');
      return;
    }

    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords match.');
      return;
    }

    signupRequestLockRef.current = true;
    lastSignupAttemptAtRef.current = now;
    setLoading(true);
    console.log('[signup] request started', { email });

    try {
      // Create account
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('[signup] request completed', { email });

      Alert.alert(
        'Account Created! 🎉',
        'A verification email has been sent. Please verify your email, then login to complete setup.',
        [
          {
            text: 'OK',
            onPress: () => router.push(`/profile/verify?email=${encodeURIComponent(email)}`)
          }
        ]
      );

    } catch (error) {
      console.error('Signup error:', error);

      let errorMessage = 'Failed to create account.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak.';
      } else if (String(error?.message || '').includes('For security purposes')) {
        errorMessage = 'Please wait a moment before requesting another verification email.';
      }

      Alert.alert('Sign Up Failed', errorMessage);
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
          {/* Back Button */}
          <View style={styles.headerContainer}>
            <ThemedButton onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color={theme.iconColor} />
            </ThemedButton>
          </View>

          <Spacer height={40} />

          {/* Title */}
          <View style={styles.titleContainer}>
            <ThemedText title style={styles.title}>Join Us</ThemedText>
            <ThemedText style={styles.subtitle}>Create your account</ThemedText>
          </View>

          <Spacer height={30} />

          {/* SignUp Card */}
          <View style={[
            styles.card,
            { backgroundColor: colorScheme === 'dark' ? 'rgba(20,20,20,0.9)' : 'rgba(255,255,255,0.95)' }
          ]}>
            <ThemedText style={styles.cardTitle}>Sign Up</ThemedText>

            <Spacer height={20} />

            {/* Email */}
            <ThemedTextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Spacer height={14} />

            {/* Password */}
            <View style={styles.passwordContainer}>
              <ThemedTextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <ThemedButton 
                onPress={() => setShowPassword(!showPassword)}
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

            {/* Confirm Password */}
            <View style={styles.passwordContainer}>
              <ThemedTextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <ThemedButton 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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

            {/* Sign Up Button */}
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

            {/* Login Link */}
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
