import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

// The anchor route: the root layout only renders once Clerk has loaded.
export default function Index() {
  const { isSignedIn } = useAuth();
  return <Redirect href={isSignedIn ? "/home" : "/onboarding"} />;
}
