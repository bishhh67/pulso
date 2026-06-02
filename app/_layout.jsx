import React from 'react'
import {useColorScheme} from 'react-native'
import {Stack} from 'expo-router'
import {Colors} from "../constants/colors"
import {StatusBar} from 'expo-status-bar'
import { AuthProvider } from '../context/AuthContext'

const RootLayout = ({children}) => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.light
    return (
        <AuthProvider>
        <StatusBar style = "auto" /> 
            <Stack screenOptions = {{
                headerStyle : {backgroundColor : theme.background},
                headerTintColor : theme.title,
            }}>
                <Stack.Screen name = "(tabs)" options = {{headerShown : false}}/>
                <Stack.Screen name = "profile" options = {{headerShown : false}}/>
                <Stack.Screen name = "clubs" options = {{headerShown : false}}/>
                <Stack.Screen name="chat" options={{ headerShown: false }} />
                <Stack.Screen 
                    name = "createPost" 
                    options = {{
                        presentation: 'modal',
                        headerShown : false
                    }}
                />
            </Stack>
            {children}
        </AuthProvider>
    )
}

export default RootLayout