import {Image, useColorScheme} from 'react-native'
import lightLogo from '../assets/pulchowkLightLogo.png'
import darkLogo from '../assets/pulchowkDarkLogo.png'

const ThemedLogo = ({...props}) => {
    
    const colorScheme = useColorScheme()
    const logo = colorScheme === 'light' ? lightLogo : darkLogo

    return (

        <Image
            source = {logo}
            {...props}
        />
    )
}

export default ThemedLogo