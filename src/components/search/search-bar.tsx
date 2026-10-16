import type { Ref } from "react";
import { TextInput, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";

// The gray query bar on Search. Submitting sends the trimmed text. The filters
// icon is shown as in the design but stays disabled until filters exist.
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  ref,
  className,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (text: string) => void;
  ref?: Ref<TextInput>;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      className={cn("h-13 flex-row items-center gap-3 rounded-full bg-surface-muted pr-4 pl-4", className)}
      style={style}
    >
      <Icon name="search" size={22} />
      <TextInput
        ref={ref}
        accessibilityLabel="Search stays"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={() => onSubmit(value.trim())}
        placeholder="Search stays"
        returnKeyType="search"
        submitBehavior="blurAndSubmit"
        autoCorrect={false}
        clearButtonMode="while-editing"
        className="h-full flex-1 font-jakarta-medium text-input text-ink placeholder:text-ink-subtle selection:text-accent"
      />
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel="Filters"
        accessibilityState={{ disabled: true }}
      >
        <Icon name="filters" size={22} />
      </View>
    </View>
  );
}
