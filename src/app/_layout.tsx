import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import "../global.css";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Text, View } from "react-native";
import {
  PostHogErrorBoundary,
  PostHogProvider,
  usePostHog,
} from "posthog-react-native";
import { useEffect, useRef, type ReactNode } from "react";

import { posthog } from "@/lib/posthog";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add your key to .env.local.\nRun: 1) clerk auth login  2) clerk link  3) clerk env pull — then restart the dev server.");
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "PlusJakartaSans-Regular": require("@/assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Medium": require("@/assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("@/assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("@/assets/fonts/PlusJakartaSans-Bold.ttf"),
  });
  const fontsReady = loaded || !!error;

  const navigator = <RootNavigator fontsReady={fontsReady} />;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {posthog ? (
        <PostHogProvider client={posthog}>
          <PostHogErrorBoundary fallback={RootErrorFallback}>
            <PostHogIdentity>{navigator}</PostHogIdentity>
          </PostHogErrorBoundary>
        </PostHogProvider>
      ) : (
        navigator
      )}
    </ClerkProvider>
  );
}

function PostHogIdentity({ children }: { children: ReactNode }) {
  const posthog = usePostHog();
  const { isLoaded, user } = useUser();
  const identifiedUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;

    if (user) {
      if (identifiedUserId.current === user.id) return;

      posthog.identify(user.id, {
        ...(user.primaryEmailAddress?.emailAddress
          ? { $email: user.primaryEmailAddress.emailAddress }
          : {}),
        ...(user.fullName ? { $name: user.fullName } : {}),
      });
      identifiedUserId.current = user.id;
      return;
    }

    if (identifiedUserId.current !== null) {
      posthog.reset();
      identifiedUserId.current = null;
    }
  }, [isLoaded, posthog, user]);

  return <>{children}</>;
}

function RootErrorFallback() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <Text className="text-center text-lg font-semibold text-gray-900">
        Something went wrong
      </Text>
      <Text className="mt-2 text-center text-gray-600">
        Please restart the app and try again.
      </Text>
    </View>
  );
}

// The splash stays up until Clerk has restored the session, so signed-in guests
// never see onboarding flash. Each guard drops its screens and their history
// when the session changes, and the index anchor sends the guest on.
function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const ready = fontsReady && isLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="(app)" />
        {/* Pushed over the tabs, so the tab bar hides on a stay. */}
        <Stack.Screen name="stay/[slug]/index" />
        <Stack.Screen name="stay/[slug]/ask" />
        <Stack.Screen name="stay/[slug]/book" />
        <Stack.Screen name="account/personal-info" />
        <Stack.Screen name="account/[topic]" />
        <Stack.Screen
          name="policies"
          options={{
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.6, 1],
            sheetExpandsWhenScrolledToEdge: true,
          }}
        />
        <Stack.Screen
          name="stay/[slug]/policies"
          options={{
            presentation: "formSheet",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.6, 1],
            sheetExpandsWhenScrolledToEdge: true,
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}
