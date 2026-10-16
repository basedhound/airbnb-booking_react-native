import { View, type StyleProp, type ViewStyle } from "react-native";

import { Icon, Text } from "@/components/ui";
import { cn } from "@/lib/cn";

export function LocationPill({
  label,
  className,
  style,
}: {
  label: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      className={cn(
        "h-10 flex-row items-center gap-2 self-start rounded-full border border-scrim-border bg-scrim px-4",
        className,
      )}
      style={style}
    >
      <Icon name="marker" size={18} tone="inverse" />
      <Text variant="label" tone="inverse">
        {label}
      </Text>
    </View>
  );
}
