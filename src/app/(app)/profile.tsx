import { useAuth, useUser } from "@clerk/expo";
import { StatusBar } from "expo-status-bar";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Wordmark } from "@/components/brand/wordmark";
import { ProfileCard } from "@/components/profile/profile-card";
import { SettingsGroup, SettingsRow } from "@/components/profile/settings-group";
import { StatsCard } from "@/components/profile/stats-card";
import { PolicyCard } from "@/components/stay/policy-card";
import { Button, IconButton, Skeleton } from "@/components/ui";
import { useRoamPolicies } from "@/hooks/use-roam-policies";
import { useFavoriteCount } from "@/lib/favorites";
import { posthog } from "@/lib/posthog";
import { displayName, guestLocation } from "@/lib/profile";

type Row = "personal_info" | "payments" | "trips" | "notifications" | "help" | "settings";

// The signed-in guest, from Clerk. Trips and Rating have no data until booking
// and guest reviews exist; Saved counts this session's hearts. Signing out
// flips the root layout's guard, which lands the guest on onboarding.
export default function Profile() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const saved = useFavoriteCount();
  const { policies, error: policiesError } = useRoamPolicies();
  const [signingOut, setSigningOut] = useState(false);

  const refund = policies?.find((p) => p.kind === "guestRefund");
  const name = displayName(user);

  const open = (row: Row, href: Href) => {
    posthog?.capture("profile_row_opened", { row });
    router.push(href);
  };

  const leave = async () => {
    setSigningOut(true);
    try {
      posthog?.capture("signed_out");
      // Clerk reloads the page on web sign-out, dropping in-memory events, so
      // send them first. Capped so PostHog never holds up signing out.
      await Promise.race([
        posthog?.flush().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="px-4 pt-2 pb-8"
      contentInsetAdjustmentBehavior="automatic"
    >
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between">
        <View className="ml-1">
          <Wordmark size="header" />
        </View>
        <IconButton
          icon="settings"
          size="bar"
          accessibilityLabel="Settings"
          onPress={() => open("settings", "/account/personal-info")}
        />
      </View>

      <View className="mt-3">
        <ProfileCard name={name} imageUrl={user?.hasImage ? user.imageUrl : null} location={guestLocation(user)} />
      </View>

      <View className="mt-1.5">
        <StatsCard
          stats={[
            { key: "trips", value: "0", label: "Trips", accessibilityLabel: "0 trips" },
            { key: "saved", value: String(saved), label: "Saved", accessibilityLabel: `${saved} saved` },
            { key: "rating", value: "New", label: "Rating", star: true, accessibilityLabel: "Rating: new" },
          ]}
        />
      </View>

      <View className="mt-2.5">
        <SettingsGroup title="Account">
          <SettingsRow icon="person" label="Personal info" onPress={() => open("personal_info", "/account/personal-info")} />
          <SettingsRow icon="card" label="Payment methods" onPress={() => open("payments", "/account/payments")} />
          <SettingsRow
            icon="suitcase"
            label="Trips"
            onPress={() => {
              posthog?.capture("profile_row_opened", { row: "trips" });
              router.navigate("/trips");
            }}
          />
        </SettingsGroup>
      </View>

      <View className="mt-2.5">
        <SettingsGroup title="Preferences">
          <SettingsRow icon="bell" label="Notifications" onPress={() => open("notifications", "/account/notifications")} />
          <SettingsRow icon="help" label="Help & support" onPress={() => open("help", "/account/help")} />
        </SettingsGroup>
      </View>

      {/* Roam's own policy text, word for word. Left out if it can't load. */}
      {policies ? (
        refund && (
          <View className="mt-2.5">
            <PolicyCard
              icon="policy"
              title={refund.title}
              subtitle={refund.summary}
              onPress={() => {
                posthog?.capture("roam_policies_opened", { from: "profile" });
                router.push({ pathname: "/policies", params: { section: refund.slug } });
              }}
            />
          </View>
        )
      ) : policiesError ? null : (
        <Skeleton className="mt-2.5 h-17 rounded-lg" />
      )}

      <Button title="Sign out" variant="secondary" loading={signingOut} onPress={leave} className="mt-6" />
    </ScrollView>
  );
}
