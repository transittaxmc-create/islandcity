import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, ClerkLoaded, useAuth, useSignIn } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { setApiAuthTokenGetter } from '@/utils/api';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    setApiAuthTokenGetter(() => getToken());
  }, [getToken]);
  if (!isSignedIn) return <SignInGate />;
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function SignInGate() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    const { error } = await signIn.password({ emailAddress, password });
    if (!error && signIn.status === 'complete') {
      await signIn.finalize({ navigate: () => undefined });
    }
  };

  const message = errors.fields.identifier?.message
    ?? errors.fields.password?.message
    ?? errors.global?.[0]?.message;

  return (
    <View style={authStyles.container}>
      <Text style={authStyles.title}>ISLANDCITY</Text>
      <Text style={authStyles.subtitle}>Sign in to protect and sync your driver records</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#777"
        style={authStyles.input}
        value={emailAddress}
        onChangeText={setEmailAddress}
      />
      <TextInput
        autoCapitalize="none"
        autoComplete="password"
        secureTextEntry
        placeholder="Password"
        placeholderTextColor="#777"
        style={authStyles.input}
        value={password}
        onChangeText={setPassword}
      />
      {!!message && <Text style={authStyles.error}>{message}</Text>}
      <Pressable
        disabled={!emailAddress || !password || fetchStatus === 'fetching'}
        onPress={submit}
        style={authStyles.button}
      >
        {fetchStatus === 'fetching'
          ? <ActivityIndicator color="#000" />
          : <Text style={authStyles.buttonText}>SIGN IN</Text>}
      </Pressable>
    </View>
  );
}

const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', padding: 28, gap: 14 },
  title: { color: '#D4AF37', fontSize: 30, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#C7C7C7', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  input: { minHeight: 54, borderWidth: 1, borderColor: '#333333', borderRadius: 10, color: '#FFFFFF', paddingHorizontal: 16, backgroundColor: '#111111' },
  error: { color: '#F87171', fontSize: 13 },
  button: { minHeight: 54, borderRadius: 10, backgroundColor: '#D4AF37', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#000000', fontWeight: '900', letterSpacing: 1 },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
