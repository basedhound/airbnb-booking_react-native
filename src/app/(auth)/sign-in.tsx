import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View, type TextInput } from "react-native";

import { AuthFooter } from "@/components/auth/auth-footer";
import { AuthScreen } from "@/components/auth/auth-screen";
import { FormError } from "@/components/auth/form-error";
import { OrDivider } from "@/components/auth/or-divider";
import { SocialButtons } from "@/components/auth/social-buttons";
import { Button, TextField } from "@/components/ui";
import { authErrorMessage } from "@/lib/auth/errors";
import { finalizeOptions } from "@/lib/auth/session";
import { firstError, validateSignIn, type FieldErrors } from "@/lib/auth/validate";
import { logPostHogInfo, posthog } from "@/lib/posthog";

type Field = "email" | "password";

export default function SignIn() {
  const router = useRouter();
  const { signIn } = useSignIn();
  const passwordRef = useRef<TextInput>(null);

  const [values, setValues] = useState<Record<Field, string>>({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [authError, setAuthError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const busy = submitting || socialBusy;

  const edit = (field: Field) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setAuthError(undefined);
  };

  const submit = async () => {
    const found = validateSignIn(values);
    setErrors(found);
    setAuthError(undefined);
    if (firstError(found)) return;

    setSubmitting(true);
    try {
      const email = values.email.trim();
      const { error } = await signIn.password({ emailAddress: email, password: values.password });
      if (error) return setAuthError(authErrorMessage(error));

      if (signIn.status === "complete") {
        const { error: unfinished } = await signIn.finalize(finalizeOptions);
        if (unfinished) return setAuthError(authErrorMessage(unfinished));
        posthog?.capture("sign_in_completed", { method: "password" });
        logPostHogInfo("authentication session completed", {
          event: "authentication_session_completed",
          method: "password",
        });
        return;
      }

      // Clerk asks for an email code when a password sign-in comes from a new device.
      const canTrust = signIn.supportedSecondFactors.some((f) => f.strategy === "email_code");
      if (signIn.status === "needs_client_trust" && canTrust) {
        const { error: unsent } = await signIn.mfa.sendEmailCode();
        if (unsent) return setAuthError(authErrorMessage(unsent));
        logPostHogInfo("authentication verification requested", {
          event: "authentication_verification_requested",
          factor: "email_code",
        });
        router.push({ pathname: "/verify", params: { email, flow: "sign-in" } });
        return;
      }

      setAuthError(authErrorMessage(undefined));
    } catch (e) {
      setAuthError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthScreen
      title={"Welcome\nback"}
      body="Sign in to see your saved stays and pick up where you left off."
      footer={
        <AuthFooter
          prompt="New to roam?"
          action="Create an account"
          disabled={busy}
          onPress={() => router.replace("/sign-up")}
        />
      }
    >
      <TextField
        icon="mail"
        label="Email address"
        placeholder="you@example.com"
        value={values.email}
        onChangeText={edit("email")}
        invalid={!!errors.email}
        editable={!busy}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        icon="lock"
        label="Password"
        placeholder="Your password"
        secure
        value={values.password}
        onChangeText={edit("password")}
        invalid={!!errors.password}
        editable={!busy}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        className="mt-3.5"
      />
      <FormError message={authError ?? firstError(errors)} />
      <Button title="Sign in" trailingIcon="arrowRight" loading={submitting} disabled={socialBusy} onPress={submit} className="mt-6" />
      <OrDivider />
      <SocialButtons disabled={submitting} onBusyChange={setSocialBusy} onError={setAuthError} />
      {/* Mount point for Clerk's bot protection, since SSO can create a sign-up; takes no space. */}
      <View nativeID="clerk-captcha" />
    </AuthScreen>
  );
}
