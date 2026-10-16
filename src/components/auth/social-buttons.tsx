import { useSSO } from "@clerk/expo";
import { styled } from "nativewind";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, Pressable, View } from "react-native";

import { GoogleMark } from "@/components/onboarding/google-mark";
import { Icon, Text } from "@/components/ui";
import { authErrorMessage } from "@/lib/auth/errors";
import { posthog } from "@/lib/posthog";

type Provider = "oauth_google" | "oauth_apple";

const Spinner = styled(ActivityIndicator, {
  className: { target: "style", nativeStyleMapping: { color: "color" } },
});

// Sign in with Apple is an iOS flow, so Android only offers Google.
const providers: { id: Provider; title: string; mark: ReactNode }[] = [
  { id: "oauth_google", title: "Continue with Google", mark: <GoogleMark /> },
  ...(Platform.OS === "ios"
    ? [{ id: "oauth_apple" as const, title: "Continue with Apple", mark: <Icon name="apple" size={26} /> }]
    : []),
];

export function SocialButtons({
  disabled,
  onBusyChange,
  onError,
}: {
  /** True while the form above is submitting. */
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  const { startSSOFlow } = useSSO();
  const [busy, setBusy] = useState<Provider | null>(null);

  const start = async (provider: Provider) => {
    setBusy(provider);
    onBusyChange?.(true);
    try {
      // Opens the provider in a browser sheet. The root layout's guard moves the
      // guest home once the session is active.
      const { createdSessionId, setActive, signUp } = await startSSOFlow({ strategy: provider });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        posthog?.capture("social_auth_completed", { auth_provider: provider.replace("oauth_", "") });
      } else if (signUp?.status === "missing_requirements") {
        onError("We couldn't finish setting up your account. Try signing up with email.");
      }
      // Otherwise the guest closed the sheet, which isn't an error.
    } catch (e) {
      onError(authErrorMessage(e));
    } finally {
      setBusy(null);
      onBusyChange?.(false);
    }
  };

  return (
    <View className="mt-3 gap-4">
      {providers.map((p) => {
        const inactive = disabled || busy !== null;
        return (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={p.title}
            accessibilityState={{ disabled: inactive, busy: busy === p.id }}
            disabled={inactive}
            onPress={() => start(p.id)}
            // The design left-aligns both titles at the same x instead of centering them.
            className="h-12 flex-row items-center gap-7 rounded-full border border-border bg-surface pl-18 active:opacity-70"
          >
            <View className="w-9 items-center">{busy === p.id ? <Spinner className="text-ink" /> : p.mark}</View>
            <Text variant="buttonSecondary">{p.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
