import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, signOut } from '../../services/supabase/auth';
import { useAuth } from '../../context/AuthContext';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import Spacer from '../../components/Spacer';

const AuthPage = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      Alert.alert('Success', 'Logged out successfully');
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  // If user is logged in, show logout
  if (user) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.contentbox}>
          <ThemedText title style={styles.text}>
            You are logged in
          </ThemedText>

          <Spacer height={20} />

          <ThemedText style={{ fontSize: 18, textAlign: 'center' }}>
            Logged in as: {user.email}
          </ThemedText>

          <Spacer />

          {loading ? (
            <ActivityIndicator size="large" color="#ff0000" />
          ) : (
            <ThemedButton
              onPress={handleLogout}
              backgroundColor={'red'}
              style={[
                { justifyContent: 'center' },
                { alignItems: 'center' },
                { borderRadius: 20 },
                { width: 150 },
                { paddingVertical: 12 }
              ]}
            >
              <ThemedText style={[
                { fontSize: 16 },
                { fontWeight: 'bold' },
                { color: '#fff' }
              ]}>
                Logout
              </ThemedText>
            </ThemedButton>
          )}
        </View>
      </ThemedView>
    );
  }

  // If not logged in, show login/signup options
  return (
    <ThemedView style={styles.container}>
      <View style={styles.contentbox}>
        <ThemedText title style={styles.text}>
          Do you have an account? If yes Login, if not Sign Up
        </ThemedText>

        <Spacer />

        <View style={styles.buttonRow}>
          {loading ? (
            <ActivityIndicator size="small" style={{ margin: 28 }} />
          ) : (
            <>
              <ThemedButton
                onPress={() => router.push('/profile/login')}
                backgroundColor={'red'}
                style={[
                  { justifyContent: 'center' },
                  { alignItems: 'center' },
                  { borderRadius: 20 },
                  { width: 150 },
                  { paddingVertical: 12 }
                ]}
              >
                <ThemedText style={[
                  { fontSize: 16 },
                  { fontWeight: 'bold' },
                ]}>
                  Login
                </ThemedText>
              </ThemedButton>

              <Spacer height={20} />

              <ThemedButton
                onPress={() => router.push('/profile/signup')}
                backgroundColor={'red'}
                style={[
                  { justifyContent: 'center' },
                  { alignItems: 'center' },
                  { borderRadius: 20 },
                  { width: 150 },
                  { paddingVertical: 12 }
                ]}
              >
                <ThemedText style={[
                  { fontSize: 16 },
                  { fontWeight: 'bold' },
                ]}>
                  Sign Up
                </ThemedText>
              </ThemedButton>
            </>
          )}
        </View>
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    textAlign: 'center',
    fontSize: 25,
    fontWeight: 'bold',
  },
  contentbox: {
    width: '80%',
  },
});

export default AuthPage;
