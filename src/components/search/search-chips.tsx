import * as Haptics from "expo-haptics";
import { ScrollView } from "react-native";

import { Chip } from "@/components/ui";
import { chipKey, chipLabel, type SearchChip } from "@/lib/search/query";

// Constraints from the query (selected) and suggestions, in one scrolling row
// that bleeds to the screen edges. Tapping toggles; one selection tick each.
export function SearchChips({
  chips,
  isSelected,
  onToggle,
}: {
  chips: SearchChip[];
  isSelected: (chip: SearchChip) => boolean;
  onToggle: (chip: SearchChip, on: boolean) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-4"
      contentContainerClassName="gap-2.5 px-4"
    >
      {chips.map((chip) => {
        const selected = isSelected(chip);
        return (
        <Chip
          key={chipKey(chip)}
          label={chipLabel(chip)}
          size="xs"
          variant="filled"
          tone="lavender"
          selected={selected}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onToggle(chip, !selected);
          }}
        />
        );
      })}
    </ScrollView>
  );
}
