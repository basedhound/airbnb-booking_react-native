import { View } from "react-native";

import { Icon, Text } from "@/components/ui";

export function RatingBox({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`Rated ${rating.toFixed(1)} from ${reviewCount} reviews`}
      className="items-center rounded-lg bg-surface-muted px-4 py-2.5"
    >
      <View className="flex-row items-center gap-1">
        <Icon name="star" size={20} tone="primary" />
        <Text variant="title">{rating.toFixed(1)}</Text>
      </View>
      <Text variant="lead" tone="subtle">
        ({reviewCount})
      </Text>
    </View>
  );
}
