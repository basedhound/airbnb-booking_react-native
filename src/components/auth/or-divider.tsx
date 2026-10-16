import { View } from "react-native";

import { Text } from "@/components/ui";

export function OrDivider() {
  return (
    <View className="mt-5 flex-row items-center gap-5">
      <View className="h-px flex-1 bg-border" />
      <Text variant="caption" tone="subtle">
        or
      </Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
