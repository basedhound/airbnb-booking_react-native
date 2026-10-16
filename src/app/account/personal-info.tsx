import { useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Alert, Button, IconButton, Text, TextField } from "@/components/ui";
import { posthog } from "@/lib/posthog";
import { guestLocation, MAX_LOCATION, MAX_NAME } from "@/lib/profile";

// The guest's name and location, saved to Clerk. Names go through
// `user.update`; location lives in `unsafeMetadata` through `updateMetadata`
// (a deep merge; `null` removes it). Email is shown but can't change here.
export default function PersonalInfo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const initial = {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    location: guestLocation(user) ?? "",
  };
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const next = { firstName: values.firstName.trim(), lastName: values.lastName.trim(), location: values.location.trim() };
  const nameChanged = next.firstName !== initial.firstName || next.lastName !== initial.lastName;
  const locationChanged = next.location !== initial.location;
  const missingName = next.firstName.length === 0;

  const back = () => (router.canGoBack() ? router.back() : router.replace("/profile"));
  const edit = (field: keyof typeof values) => (text: string) => {
    setFailed(false);
    setValues((v) => ({ ...v, [field]: text }));
  };

  const save = async () => {
    if (!user || saving || missingName || (!nameChanged && !locationChanged)) return;
    setSaving(true);
    setFailed(false);
    try {
      if (nameChanged) await user.update({ firstName: next.firstName, lastName: next.lastName });
      if (locationChanged) await user.updateMetadata({ unsafeMetadata: { location: next.location || null } });
      // Which fields changed, never what the guest typed.
      posthog?.capture("profile_updated", { name: nameChanged, location: locationChanged });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      back();
    } catch {
      // The draft stays so the guest can try again.
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View className="flex-row items-center gap-3 border-b border-border px-5 py-2">
        <IconButton icon="chevronLeft" size="nav" accessibilityLabel="Back" onPress={back} />
        <Text variant="title" accessibilityRole="header" className="flex-1">
          Personal info
        </Text>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerClassName="gap-3 px-5 pt-5"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        >
          {failed && <Alert tone="danger" message="Couldn’t save your changes. Try again." />}

          <TextField
            icon="person"
            label="First name"
            placeholder="Your first name"
            value={values.firstName}
            onChangeText={edit("firstName")}
            invalid={missingName}
            editable={!saving}
            maxLength={MAX_NAME}
            autoCapitalize="words"
            autoComplete="given-name"
            textContentType="givenName"
            returnKeyType="next"
          />
          <TextField
            icon="person"
            label="Last name"
            placeholder="Optional"
            value={values.lastName}
            onChangeText={edit("lastName")}
            editable={!saving}
            maxLength={MAX_NAME}
            autoCapitalize="words"
            autoComplete="family-name"
            textContentType="familyName"
            returnKeyType="next"
          />
          <TextField
            icon="pin"
            label="Location"
            placeholder="City, region"
            value={values.location}
            onChangeText={edit("location")}
            editable={!saving}
            maxLength={MAX_LOCATION}
            autoCapitalize="words"
            textContentType="addressCityAndState"
            returnKeyType="done"
            onSubmitEditing={save}
          />
          {missingName && (
            <Text variant="caption" tone="danger">
              Add your first name to save.
            </Text>
          )}

          <View className="mt-3 gap-1.5">
            <TextField
              icon="mail"
              label="Email"
              value={user?.primaryEmailAddress?.emailAddress ?? ""}
              editable={false}
              accessibilityHint="Email can't be changed here"
            />
            <Text variant="caption" tone="subtle">
              Email changes aren’t available in Roam yet.
            </Text>
          </View>

          <Button
            title="Save"
            loading={saving}
            disabled={missingName || (!nameChanged && !locationChanged)}
            onPress={save}
            className="mt-5"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
