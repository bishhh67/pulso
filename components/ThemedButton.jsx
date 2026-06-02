import {Pressable, useColorScheme, StyleSheet} from 'react-native'
import {Colors} from '../constants/colors'

const ThemedButton = ({style, backgroundColor, ...props}) => {

    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light

    return (
        <Pressable
          style={({ pressed }) => [
                    styles.button,
                    {
                        backgroundColor: backgroundColor ?? theme.buttoncd,
                    },
                    pressed && styles.buttonPressed,
                    style,
            ]}
            {...props}
        />
    )


}

const styles = StyleSheet.create({

    button : {
        padding : 15,
        marginBottom : 1,
    },

    buttonPressed : {
        opacity : 0.5,
    },

})

export default ThemedButton