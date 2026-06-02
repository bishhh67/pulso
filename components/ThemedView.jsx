import { View, useColorScheme } from 'react-native'
import { Colors } from '../constants/colors'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

const ThemedView = ({ children, style, safe = false, ...props }) => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  if (!safe) {
    return (
      <View
        style={[
            { backgroundColor: theme.background },
             style
        ]}
        {...props}
      >
        {children}
      </View>
    )
  }

  const insets = useSafeAreaInsets()

  return (
    <SafeAreaView
      style={[
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </SafeAreaView>
  )
}

export default ThemedView
