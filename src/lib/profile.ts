import type { useUser } from "@clerk/expo";

type User = NonNullable<ReturnType<typeof useUser>["user"]>;

export const MAX_NAME = 50;
export const MAX_LOCATION = 60;

// The name Profile shows: full name, then first name, then the email's local part.
export function displayName(user: User | null | undefined) {
  const email = user?.primaryEmailAddress?.emailAddress;
  return user?.fullName?.trim() || user?.firstName?.trim() || email?.split("@")[0] || "Roam guest";
}

// The guest's own "City, region", set in Personal info and kept in Clerk's
// unsafeMetadata (client-writable, so it's display-only and never trusted).
export function guestLocation(user: User | null | undefined) {
  const value = user?.unsafeMetadata?.location;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
