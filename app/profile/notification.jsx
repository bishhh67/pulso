import {View, StyleSheet, useColorScheme} from 'react-native'

import {Ionicons} from '@expo/vector-icons'
import {Link} from 'expo-router'
import ThemedView from '../../components/ThemedView'
import ThemedText from '../../components/ThemedText'
import ThemedButton from '../../components/ThemedButton'
import Spacer from '../../components/Spacer'
import {Colors} from '../../constants/colors'
import ThemedIcon from '../../components/ThemedIcon'


const Notification = () => {
    return (
        <ThemedView style = {styles.container} safe = {true}>

            <ThemedView style = {styles.contentbox}>

            <ThemedText title = {true} style = {styles.text}>
                Notifications
            </ThemedText>

            <Spacer height = {20}/>
            
            <ThemedText>
                Receive the latest news from Pulchowk Campus
            </ThemedText>

            </ThemedView>

        </ThemedView>
    )
}

const styles = StyleSheet.create({
    
    container : {
        flex : 1,
        alignItems : 'center',
    },

    text : {
        marginTop : 10,
        fontSize : 40,
        fontWeight : 'bold',
        paddingTop : 20,
    },

    contentbox : {
        width : '80%',
    }
    
})

export default Notification