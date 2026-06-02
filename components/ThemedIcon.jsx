import {Ionicons} from '@expo/vector-icons'
import {useColorScheme} from 'react-native'
import {Colors} from '../constants/colors'

const ThemedIcon = ({ name, size = 24, style }) => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light

  return (
    <Ionicons
      name={name}
      size={size}
      color={theme.iconColor}
      style={style}
    />
  )
}

export default ThemedIcon
