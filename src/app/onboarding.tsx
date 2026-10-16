import { GlassView as RNGlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Image as RNImage } from "expo-image";
import { useRouter } from "expo-router";
import { styled } from "nativewind";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Wordmark } from "@/components/brand/wordmark";
import { GoogleMark } from "@/components/onboarding/google-mark";
import { LocationPill } from "@/components/onboarding/location-pill";
import { PageDots } from "@/components/onboarding/page-dots";
import { SheetCurve } from "@/components/onboarding/sheet-curve";
import { slides } from "@/components/onboarding/slides";
import { Button, Text } from "@/components/ui";
import { motion } from "@/theme";

// Third-party views need their className mapped to style.
const Image = styled(RNImage, { className: "style" });
const GlassView = styled(RNGlassView, { className: "style" });

const glass = isLiquidGlassAvailable();

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const slide = slides[index];

  const onPageChange = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View className="flex-1 bg-surface">
      <StatusBar style="dark" />

      <ScrollView
        horizontal
        pagingEnabled
        contentInsetAdjustmentBehavior="never"
        showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onPageChange}>
        {slides.map((s) => (
          <View key={s.id} style={{ width, height }}>
            <Image
              source={s.image}
              contentFit="cover"
              transition={motion.base}
              accessibilityIgnoresInvertColors
              className="absolute inset-0"
            />
            {sheetHeight > 0 && <LocationPill label={s.location} className="absolute left-6" style={{ bottom: sheetHeight + 20 }} />}
          </View>
        ))}
      </ScrollView>

      <View
        className="absolute inset-x-0 flex-row items-center justify-between px-6"
        style={{ top: insets.top + 16 }}
        pointerEvents="box-none"
      >
        <Wordmark />
        <Pressable accessibilityRole="button" onPress={() => router.push("/sign-in")} className="active:opacity-70">
          {glass ? (
            <GlassView isInteractive className="h-10 justify-center rounded-full px-4">
              <Text variant="buttonSecondary">Skip</Text>
            </GlassView>
          ) : (
            <View className="h-10 justify-center rounded-full bg-glass px-4">
              <Text variant="buttonSecondary">Skip</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View className="absolute inset-x-0 bottom-0" onLayout={(e) => setSheetHeight(e.nativeEvent.layout.height)}>
        <SheetCurve className="absolute top-0" />
        <View className="absolute inset-x-0 top-16 bottom-0 bg-surface" />
        <View className="px-6 pt-7 pb-6">
          {/* The design insets dots and copy slightly from the buttons' edge. */}
          <View className="px-1.5">
            <PageDots count={slides.length} index={index} />
          </View>
          <Animated.View key={slide.id} entering={FadeIn.duration(motion.base)} className="px-1.5">
            <Text variant="hero" className="mt-6">
              {slide.title}
            </Text>
            <Text variant="lead" tone="muted" className="mt-3">
              {slide.body}
            </Text>
          </Animated.View>
          <View className="mt-4 gap-3">
            <Button title="Get started" trailingIcon="arrowRight" onPress={() => router.push("/sign-up")} />
            <Button
              title="Continue with Google"
              variant="secondary"
              icon={<GoogleMark />}
              onPress={() => router.push("/sign-in")}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
