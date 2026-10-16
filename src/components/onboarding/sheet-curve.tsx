import { styled } from "nativewind";
import { useWindowDimensions } from "react-native";
import RNSvg, { Path } from "react-native-svg";

const Svg = styled(RNSvg, { className: "style" });

// Lets the fill come from a token class.
const StyledPath = styled(Path, {
  className: { target: false, nativeStyleMapping: { color: "fill" } },
});

export const SHEET_CURVE_HEIGHT = 64;

/** The sheet's curved top edge: high at the left, sweeping down into a wide corner on the right. */
export function SheetCurve({ className }: { className?: string }) {
  const { width: w } = useWindowDimensions();
  const h = SHEET_CURVE_HEIGHT;
  const d = [
    `M0 ${h}`,
    "L0 28",
    "Q0 2 28 1",
    `C${w * 0.45} -2 ${w * 0.72} 6 ${w - 44} 30`,
    `Q${w} 50 ${w} ${h}`,
    "Z",
  ].join(" ");

  return (
    <Svg width={w} height={h} className={className}>
      <StyledPath d={d} className="text-surface" />
    </Svg>
  );
}
