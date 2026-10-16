import * as Haptics from "expo-haptics";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AnswerCard } from "@/components/ask/answer-card";
import { AskInput } from "@/components/ask/ask-input";
import { MessageBubble } from "@/components/ask/message-bubble";
import { TopicChips } from "@/components/ask/topic-chips";
import { LoadError } from "@/components/load-error";
import { EmptyState, IconButton, Spinner, Text } from "@/components/ui";
import { useAsk } from "@/hooks/use-ask";
import { useStay } from "@/hooks/use-stay";
import { answerFor, matchTopics, NO_ANSWER, TOPICS, type AnswerCard as AnswerCardData, type TopicKey } from "@/lib/ask";
import { posthog } from "@/lib/posthog";
import { motion } from "@/theme";

type Message =
  | { id: number; from: "roam" | "guest"; text: string }
  | { id: number; from: "pending" }
  | { id: number; from: "answer"; cards: AnswerCardData[] };

const WELCOME: Message = {
  id: 0,
  from: "roam",
  text: "Ask about check-in, pets, cancellation and more. Answers quote this stay’s details and Roam’s guest policies as written.",
};

const messageEnter = FadeInDown.duration(motion.base).easing(motion.easeOut).reduceMotion(ReduceMotion.System);

// "Ask about this stay": questions in, answer cards out. Every card is the
// stay's own text, Roam's policy text or a checked Knowledge Base section, as
// written, never generated. POST /api/ask picks the passages with Jev; if it
// fails, the keyword matching in src/lib/ask.ts answers instead.
export default function AskScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stay, error, retry } = useStay(slug);
  const askServer = useAsk();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const nextId = useRef(1);
  const list = useRef<ScrollView>(null);
  // Aborts every request still in flight when the screen closes.
  const requests = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    requests.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    posthog?.capture("stay_ask_opened", { slug });
  }, [slug]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () =>
      setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () =>
      setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: "/stay/[slug]", params: { slug } }));

  // `chip` is the chip's topic, so the fallback answers it exactly.
  const ask = (question: string, from: "chip" | "typed", chip?: TopicKey) => {
    const signal = requests.current?.signal;
    if (!stay || !signal) return;
    Haptics.selectionAsync().catch(() => {});
    const id = nextId.current;
    nextId.current += 3;
    setMessages((m) => [...m, { id, from: "guest", text: question }, { id: id + 1, from: "pending" }]);

    askServer(slug, question, signal)
      .then((answer) => ({ ...answer, answeredBy: "jev" as const }))
      .catch(() => {
        const topics = chip ? [chip] : matchTopics(question);
        return { cards: answerFor(stay, topics), topics: topics as string[], answeredBy: "fallback" as const };
      })
      .then(({ cards, topics, answeredBy }) => {
        if (signal.aborted) return;
        // A new id, so the answer animates in where the pending bubble was.
        setMessages((m) => m.map((msg) => (msg.id === id + 1 ? { id: id + 2, from: "answer", cards } : msg)));
        // Passage ids and topic keys only: what guests type is never sent.
        posthog?.capture("stay_ask_sent", { slug, from, topics, answered: cards[0]?.key !== NO_ANSWER.key, answeredBy });
      });
  };

  const openPolicies = (section?: string) => {
    posthog?.capture("stay_policies_opened", { slug, from: "ask_answer" });
    router.push({ pathname: "/stay/[slug]/policies", params: section ? { slug, section } : { slug } });
  };

  let body;
  if (!stay) {
    body = (
      <View className="flex-1 justify-center">
        {stay === null ? (
          <EmptyState
            icon="pinOff"
            title="This stay isn’t available"
            message="It may have been removed by its host."
            action={{ title: "Back", onPress: back }}
          />
        ) : error ? (
          <LoadError error={error} subject="this stay" onRetry={retry} />
        ) : (
          <Spinner size="large" accessibilityLabel="Loading this stay" />
        )}
      </View>
    );
  } else {
    body = (
      <>
        <ScrollView
          ref={list}
          className="flex-1"
          contentContainerClassName="gap-4 px-5 py-5"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <Animated.View
              key={message.id}
              entering={message.id === 0 ? undefined : messageEnter}
              className={message.from === "answer" ? "gap-2.5" : undefined}
              accessibilityLiveRegion={message.from === "answer" || message.from === "pending" ? "polite" : undefined}
            >
              {message.from === "answer" ? (
                message.cards.map((card) => <AnswerCard key={card.key} card={card} onOpenPolicies={openPolicies} />)
              ) : message.from === "pending" ? (
                <MessageBubble from="roam" text="Checking Roam’s policies…" />
              ) : (
                <MessageBubble from={message.from} text={message.text} />
              )}
            </Animated.View>
          ))}
        </ScrollView>

        <View
          className="gap-3 border-t border-border bg-surface pt-3"
          style={{ paddingBottom: keyboardOpen ? 8 : insets.bottom + 8 }}
        >
          <TopicChips
            onAsk={(key) => {
              const topic = TOPICS.find((t) => t.key === key);
              if (topic) ask(topic.question, "chip", key);
            }}
          />
          <AskInput onSend={(text) => ask(text, "typed")} />
        </View>
      </>
    );
  }

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View className="flex-row items-center gap-3 border-b border-border px-5 py-2">
        <IconButton icon="chevronLeft" size="nav" accessibilityLabel="Back" onPress={back} />
        <View className="flex-1">
          <Text variant="title" accessibilityRole="header">
            Ask about this stay
          </Text>
          {stay ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {stay.title}
            </Text>
          ) : null}
        </View>
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {body}
      </KeyboardAvoidingView>
    </View>
  );
}
