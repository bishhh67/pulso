import { View, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import ThemedButton from '../../components/ThemedButton';
import Spacer from '../../components/Spacer';
import { Colors } from '../../constants/colors';
import ThemedIcon from '../../components/ThemedIcon';

const Profile = () => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme] ?? Colors.light;
  const router = useRouter();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.contentBox} safe={true}>
        <ThemedText style={styles.text} title={true}>
          Settings
        </ThemedText>

        <Spacer />

        <ThemedText style={{ fontSize: 20 }}>
          Get quick access by using your personal account
        </ThemedText>

        <Spacer height={20} />

        <ThemedButton
          onPress={() => router.push('/profile/authPage')}
          backgroundColor={'red'}
          style={[{ borderRadius: 20 }, { width: '55%' }]}
        >
          <ThemedText
            title={true}
            style={[{ fontSize: 16 }, { fontWeight: 'bold' }]}
          >
            Sign In or Register
          </ThemedText>
        </ThemedButton>

        <Spacer />

        <ThemedButton onPress={() => router.push('/profile/notification')}>
          <View style={styles.buttonRow}>
            <ThemedText
              title={true}
              style={[{ fontSize: 16 }, { fontWeight: 'bold' }]}
            >
              Notifications
            </ThemedText>
            <ThemedIcon name="chevron-forward-outline" size={18} />
          </View>
        </ThemedButton>

        <ThemedButton onPress={() => router.push('/profile/appsettings')}>
          <View style={styles.buttonRow}>
            <ThemedText
              title={true}
              style={[{ fontSize: 16 }, { fontWeight: 'bold' }]}
            >
              App settings
            </ThemedText>
            <ThemedIcon name="chevron-forward-outline" size={18} />
          </View>
        </ThemedButton>

        <Spacer />

        <ThemedButton>
          <View style={styles.buttonRow}>
            <ThemedText
              title={true}
              style={[{ fontSize: 16 }, { fontWeight: 'bold' }]}
            >
              Feedback and support
            </ThemedText>
            <ThemedIcon name="chevron-forward-outline" size={18} />
          </View>
        </ThemedButton>

        <ThemedButton>
          <View style={styles.buttonRow}>
            <ThemedText
              title={true}
              style={[{ fontSize: 16 }, { fontWeight: 'bold' }]}
            >
              Legal and privacy
            </ThemedText>
            <ThemedIcon name="chevron-forward-outline" size={18} />
          </View>
        </ThemedButton>

        <Link href="/home" asChild>
          <Ionicons
            name="close"
            size={32}
            style={styles.linkHome}
            color={theme.iconColorFocused}
          />
        </Link>
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },

  contentBox: {
    width: '80%',
  },

  text: {
    fontSize: 40,
    fontWeight: 'bold',
    paddingTop: 30,
  },

  linkHome: {
    position: 'absolute',
    right: 0,
    top: 80,
  },

  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default Profile;