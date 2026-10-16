import { View } from "react-native";

import { cn } from "@/lib/cn";

export function PageDots({ count, index }: { count: number; index: number }) {
  return (
    <View
      className="flex-row gap-2"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Page ${index + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} className={cn("h-1.5 w-9 rounded-full", i === index ? "bg-lavender" : "bg-border")} />
      ))}
    </View>
  );
}
