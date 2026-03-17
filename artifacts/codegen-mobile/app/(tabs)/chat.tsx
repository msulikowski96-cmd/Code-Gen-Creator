import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeInDown,
  SlideInDown,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import type { GeneratedFile } from "@workspace/api-client-react";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  generatedFiles?: GeneratedFile[];
  moduleName?: string;
  specType?: string;
  platform?: string;
}

const STARTER_PROMPTS = [
  { icon: "bluetooth-outline" as const, text: "Bluetooth scanning module" },
  { icon: "camera-outline" as const, text: "Camera capture NativeModule" },
  { icon: "finger-print-outline" as const, text: "Biometric auth module" },
  { icon: "location-outline" as const, text: "GPS location tracker" },
  { icon: "lock-closed-outline" as const, text: "Encrypted storage module" },
  { icon: "layers-outline" as const, text: "Custom video player component" },
];

function StreamingDots() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const animate = (val: typeof dot1, delay: number) => {
      const loop = () => {
        val.value = withTiming(1, { duration: 400 }, () => {
          val.value = withTiming(0.3, { duration: 400 }, loop);
        });
      };
      setTimeout(loop, delay);
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.dotsRow}>
      <Animated.View style={[styles.dot, s1]} />
      <Animated.View style={[styles.dot, s2]} />
      <Animated.View style={[styles.dot, s3]} />
    </View>
  );
}

function MessageBubble({
  message,
  theme,
}: {
  message: ChatMessage;
  theme: typeof Colors.dark;
}) {
  const isUser = message.role === "user";

  const handleViewFiles = () => {
    if (!message.generatedFiles?.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/result",
      params: {
        moduleName: message.moduleName,
        specType: message.specType,
        platform: message.platform,
        files: JSON.stringify(message.generatedFiles),
      },
    });
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(200).springify()}
      style={[styles.messageRow, isUser && styles.messageRowUser]}
    >
      {!isUser && (
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.primary, shadowColor: theme.primary },
          ]}
        >
          <Ionicons name="sparkles" size={14} color="#fff" />
        </View>
      )}

      <View style={[styles.bubbleWrapper, isUser && { alignItems: "flex-end" }]}>
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.bubbleUser, { backgroundColor: theme.primary }]
              : [styles.bubbleAssistant, { backgroundColor: theme.surface, borderColor: theme.border }],
          ]}
        >
          {message.isStreaming && !message.content ? (
            <StreamingDots />
          ) : (
            <Text
              style={[
                styles.bubbleText,
                { color: isUser ? "#fff" : theme.text },
              ]}
            >
              {message.content}
            </Text>
          )}
        </View>

        {/* View files button */}
        {message.generatedFiles && message.generatedFiles.length > 0 && (
          <Animated.View entering={FadeIn.delay(300).duration(300)}>
            <Pressable
              onPress={handleViewFiles}
              style={[
                styles.viewFilesBtn,
                {
                  backgroundColor: theme.primaryMuted,
                  borderColor: theme.primary + "40",
                },
              ]}
            >
              <Ionicons name="code-slash" size={13} color={theme.primary} />
              <Text style={[styles.viewFilesBtnText, { color: theme.primary }]}>
                View {message.generatedFiles.length} generated files
              </Text>
              <Ionicons name="chevron-forward" size={13} color={theme.primary} />
            </Pressable>
          </Animated.View>
        )}

        {message.isStreaming && message.content && (
          <View style={styles.streamingIndicator}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.streamingText, { color: theme.textMuted }]}>
              Generating...
            </Text>
          </View>
        )}
      </View>

      {isUser && (
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.surfaceElevated, borderColor: theme.border, borderWidth: 1 },
          ]}
        >
          <Ionicons name="person" size={14} color={theme.textSecondary} />
        </View>
      )}
    </Animated.View>
  );
}

function EmptyState({
  theme,
  onPromptTap,
}: {
  theme: typeof Colors.dark;
  onPromptTap: (p: string) => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={styles.emptyContainer}
    >
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
        <Ionicons name="sparkles" size={28} color="#fff" />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>AI Codegen</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Describe what you want to build and I'll generate the TypeScript spec and native code.
      </Text>

      <View style={styles.promptGrid}>
        {STARTER_PROMPTS.map((p) => (
          <Pressable
            key={p.text}
            onPress={() => {
              Haptics.selectionAsync();
              onPromptTap(p.text);
            }}
            style={({ pressed }) => [
              styles.promptChip,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name={p.icon} size={15} color={theme.primary} />
            <Text style={[styles.promptChipText, { color: theme.textSecondary }]}>
              {p.text}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
      };
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: trimmed });

      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setInput("");
      setIsLoading(true);
      scrollToBottom();

      abortRef.current = new AbortController();

      try {
        const response = await fetch(`${API_BASE}/codegen/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history }),
          signal: abortRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let fullContent = "";
        let genData: {
          files: GeneratedFile[];
          moduleName: string;
          specType: string;
          platform: string;
        } | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "token") {
                fullContent += event.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsg.id ? { ...m, content: fullContent } : m
                  )
                );
                scrollToBottom();
              } else if (event.type === "generated") {
                genData = {
                  files: event.files,
                  moduleName: event.moduleName,
                  specType: event.specType,
                  platform: event.platform,
                };
              } else if (event.type === "done") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsg.id
                      ? {
                          ...m,
                          content: fullContent,
                          isStreaming: false,
                          ...(genData
                            ? {
                                generatedFiles: genData.files,
                                moduleName: genData.moduleName,
                                specType: genData.specType,
                                platform: genData.platform,
                              }
                            : {}),
                        }
                      : m
                  )
                );
                scrollToBottom();
              } else if (event.type === "error") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsg.id
                      ? {
                          ...m,
                          content: `Error: ${event.message}`,
                          isStreaming: false,
                        }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsg.id
                ? {
                    ...m,
                    content: "Connection error. Please check your connection and try again.",
                    isStreaming: false,
                  }
                : m
            )
          );
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading]
  );

  const handleReset = () => {
    Alert.alert("New Chat", "Start a new conversation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "New Chat",
        style: "destructive",
        onPress: () => {
          abortRef.current?.abort();
          setMessages([]);
          setIsLoading(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: theme.primary, shadowColor: theme.primary }]}>
            <Ionicons name="sparkles" size={14} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>AI Codegen</Text>
            <View style={styles.headerStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: theme.green }]} />
              <Text style={[styles.headerStatus, { color: theme.textMuted }]}>Gemini 3 Flash · React Native Expert</Text>
            </View>
          </View>
        </View>
        {messages.length > 0 && (
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.resetBtn,
              {
                backgroundColor: theme.surfaceElevated,
                borderColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="refresh-cw" size={14} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top + 56}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={
            messages.length === 0
              ? { flex: 1 }
              : { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 }
          }
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
          {messages.length === 0 ? (
            <EmptyState theme={theme} onPromptTap={(p) => sendMessage(p)} />
          ) : (
            <View style={{ gap: 16 }}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} theme={theme} />
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Describe what you want to build..."
              placeholderTextColor={theme.textMuted}
              style={[styles.textInput, { color: theme.text }]}
              multiline
              maxLength={1000}
              editable={!isLoading}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage(input)}
            />
            <Pressable
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              style={({ pressed }) => [
                styles.sendBtn,
                {
                  backgroundColor:
                    !input.trim() || isLoading
                      ? theme.surfaceElevated
                      : theme.primary,
                  opacity: pressed ? 0.8 : 1,
                  shadowColor: theme.primary,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.textMuted} />
              ) : (
                <Ionicons
                  name="send"
                  size={16}
                  color={!input.trim() ? theme.textMuted : "#fff"}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  headerStatusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  headerStatus: { fontSize: 11, fontFamily: "Inter_400Regular" },
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  messageRowUser: { flexDirection: "row-reverse" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  bubbleWrapper: { flex: 1, gap: 6 },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  bubbleUser: { borderTopRightRadius: 4 },
  bubbleAssistant: {
    borderTopLeftRadius: 4,
    borderWidth: 1,
  },
  bubbleText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  viewFilesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewFilesBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  streamingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  streamingText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dotsRow: { flexDirection: "row", gap: 4, paddingVertical: 4 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#888",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 320,
    marginBottom: 8,
  },
  promptGrid: {
    width: "100%",
    gap: 8,
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  promptChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  inputBar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 20,
    borderWidth: 1,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
    paddingVertical: 4,
    lineHeight: 20,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});
