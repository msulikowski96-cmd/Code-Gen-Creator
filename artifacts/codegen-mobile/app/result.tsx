import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useGetHistoryItem, useGenerateCode } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const LANG_COLORS: Record<string, string> = {
  java: "#B07219",
  kotlin: "#A97BFF",
  cpp: "#555",
  objc: "#438EFF",
  swift: "#FA7343",
  typescript: "#3178C6",
};

const LANG_LABELS: Record<string, string> = {
  java: "Java",
  kotlin: "Kotlin",
  cpp: "C++",
  objc: "Obj-C",
  swift: "Swift",
  typescript: "TypeScript",
};

const PLATFORM_LABELS: Record<string, string> = {
  android: "Android",
  ios: "iOS",
  shared: "Shared",
};

const PLATFORM_ICON_NAMES: Record<string, "logo-android" | "logo-apple" | "git-network-outline"> = {
  android: "logo-android",
  ios: "logo-apple",
  shared: "git-network-outline",
};

interface GeneratedFile {
  filename: string;
  language: string;
  platform: string;
  content: string;
}

function CopyButton({ content, theme }: { content: string; theme: typeof Colors.dark }) {
  const [copied, setCopied] = useState(false);
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withTiming(1, { duration: 80 })
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handleCopy}
        style={[
          styles.copyBtn,
          {
            backgroundColor: copied ? theme.greenMuted : theme.surfaceElevated,
            borderColor: copied ? theme.green + "50" : theme.border,
          },
        ]}
      >
        <Feather
          name={copied ? "check" : "copy"}
          size={13}
          color={copied ? theme.green : theme.textSecondary}
        />
        <Text style={[styles.copyBtnText, { color: copied ? theme.green : theme.textSecondary }]}>
          {copied ? "Copied" : "Copy"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function FileViewer({
  files,
  theme,
  isDark,
}: {
  files: GeneratedFile[];
  theme: typeof Colors.dark;
  isDark: boolean;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = files[selectedIdx];

  const platformGroups: Record<string, GeneratedFile[]> = {};
  files.forEach((f) => {
    if (!platformGroups[f.platform]) platformGroups[f.platform] = [];
    platformGroups[f.platform].push(f);
  });

  return (
    <View style={{ flex: 1 }}>
      {/* File tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabScroll, { borderBottomColor: theme.border }]}
        contentContainerStyle={styles.tabScrollContent}
      >
        {files.map((f, idx) => {
          const isActive = idx === selectedIdx;
          const langColor = LANG_COLORS[f.language] ?? theme.primary;
          return (
            <Pressable
              key={idx}
              onPress={() => {
                setSelectedIdx(idx);
                Haptics.selectionAsync();
              }}
              style={[
                styles.tab,
                isActive && { borderBottomColor: langColor, borderBottomWidth: 2 },
              ]}
            >
              <View
                style={[
                  styles.tabLangDot,
                  { backgroundColor: langColor + (isActive ? "FF" : "80") },
                ]}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? theme.text : theme.textSecondary },
                  isActive && { fontFamily: "Inter_600SemiBold" },
                ]}
              >
                {f.filename}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* File info bar */}
      <View style={[styles.fileInfoBar, { backgroundColor: theme.surfaceElevated, borderBottomColor: theme.border }]}>
        <View style={styles.fileInfoLeft}>
          <Ionicons
            name={PLATFORM_ICON_NAMES[selected.platform] ?? "code-slash"}
            size={13}
            color={theme.textMuted}
          />
          <Text style={[styles.fileInfoText, { color: theme.textMuted }]}>
            {PLATFORM_LABELS[selected.platform]}
          </Text>
          <View style={[styles.fileInfoDivider, { backgroundColor: theme.border }]} />
          <View style={[styles.langBadge, { backgroundColor: (LANG_COLORS[selected.language] ?? theme.primary) + "20" }]}>
            <Text style={[styles.langBadgeText, { color: LANG_COLORS[selected.language] ?? theme.primary }]}>
              {LANG_LABELS[selected.language] ?? selected.language}
            </Text>
          </View>
        </View>
        <CopyButton content={selected.content} theme={theme} />
      </View>

      {/* Code content */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        horizontal={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Text
            style={[
              styles.code,
              {
                color: theme.text,
                backgroundColor: theme.surface,
                fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
              },
            ]}
            selectable
          >
            {selected.content}
          </Text>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

export default function ResultScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    moduleName?: string;
    specType?: string;
    platform?: string;
    files?: string;
    fromHistory?: string;
    fromTemplate?: string;
    spec?: string;
    templateName?: string;
  }>();

  const generateMutation = useGenerateCode();

  const isHistory = params.fromHistory === "1";
  const isTemplate = params.fromTemplate === "1";

  // For history items, fetch from API
  const historyQuery = useGetHistoryItem(
    isHistory ? Number(params.id) : 0,
    { query: { enabled: isHistory && !!params.id } }
  );

  // For fresh results, parse from params
  let files: GeneratedFile[] = [];
  let moduleName = params.moduleName ?? "";
  let specType = params.specType ?? "";
  let platform = params.platform ?? "";

  if (isHistory) {
    if (historyQuery.data) {
      files = historyQuery.data.files as GeneratedFile[];
      moduleName = historyQuery.data.moduleName;
      specType = historyQuery.data.specType;
      platform = historyQuery.data.platform;
    }
  } else if (!isTemplate && params.files) {
    try {
      files = JSON.parse(params.files);
    } catch {}
  }

  const handleShare = async () => {
    if (!files.length) return;
    const text = files
      .map((f) => `// ===== ${f.filename} =====\n${f.content}`)
      .join("\n\n");
    await Share.share({ message: text, title: `${moduleName} generated code` });
  };

  const handleGenerateFromTemplate = async () => {
    if (!params.spec || !params.moduleName) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await generateMutation.mutateAsync({
        data: {
          moduleName: params.moduleName,
          specType: (params.specType ?? "NativeModule") as "NativeModule" | "NativeComponent",
          platform: "both",
          spec: params.spec,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Replace current route with fresh result
      router.replace({
        pathname: "/result",
        params: {
          id: String(result.id),
          moduleName: result.moduleName,
          specType: result.specType,
          platform: result.platform,
          files: JSON.stringify(result.files),
        },
      });
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const isLoading = isHistory && historyQuery.isLoading;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top,
        },
      ]}
    >
      {/* Nav bar */}
      <View style={[styles.navbar, { borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.navBack, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="chevron-down" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.navCenter}>
          <Text style={[styles.navTitle, { color: theme.text }]} numberOfLines={1}>
            {isTemplate ? (params.templateName ?? "Template") : moduleName || "Result"}
          </Text>
          {!isTemplate && (
            <Text style={[styles.navSubtitle, { color: theme.textSecondary }]}>
              {specType} · {platform}
            </Text>
          )}
        </View>
        {!isTemplate && (
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.navAction, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="share" size={18} color={theme.primary} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : isTemplate ? (
        // Template view: show spec + generate button
        <View style={{ flex: 1 }}>
          <View style={[styles.templateInfoBar, { backgroundColor: theme.surfaceElevated, borderBottomColor: theme.border }]}>
            <View style={styles.templateInfoLeft}>
              <Ionicons
                name={params.specType === "NativeComponent" ? "layers-outline" : "cube-outline"}
                size={14}
                color={params.specType === "NativeComponent" ? theme.green : theme.primary}
              />
              <Text style={[styles.templateInfoText, { color: theme.textSecondary }]}>
                {params.specType} · {params.moduleName}
              </Text>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text
                style={[
                  styles.code,
                  {
                    color: theme.text,
                    backgroundColor: theme.surface,
                    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
                  },
                ]}
                selectable
              >
                {params.spec}
              </Text>
            </ScrollView>
          </ScrollView>
          <View
            style={[
              styles.templateFooter,
              { borderTopColor: theme.border, paddingBottom: insets.bottom + 12 },
            ]}
          >
            <Pressable
              onPress={handleGenerateFromTemplate}
              disabled={generateMutation.isPending}
              style={[
                styles.generateBtn,
                { backgroundColor: theme.primary },
                generateMutation.isPending && { opacity: 0.6 },
              ]}
            >
              {generateMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="play" size={16} color="#fff" />
              )}
              <Text style={styles.generateBtnText}>
                {generateMutation.isPending ? "Generating..." : "Generate from This Template"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : files.length > 0 ? (
        // Generated files viewer
        <View style={{ flex: 1 }}>
          {/* Summary chips */}
          <View style={[styles.summaryRow, { borderBottomColor: theme.border }]}>
            <View style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Feather name="file-text" size={11} color={theme.textSecondary} />
              <Text style={[styles.chipText, { color: theme.textSecondary }]}>
                {files.length} files
              </Text>
            </View>
            {["android", "ios", "shared"].map((p) => {
              const count = files.filter((f) => f.platform === p).length;
              if (!count) return null;
              return (
                <View
                  key={p}
                  style={[styles.chip, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Ionicons
                    name={PLATFORM_ICON_NAMES[p]}
                    size={11}
                    color={theme.textSecondary}
                  />
                  <Text style={[styles.chipText, { color: theme.textSecondary }]}>
                    {PLATFORM_LABELS[p]}
                  </Text>
                </View>
              );
            })}
          </View>
          <FileViewer files={files} theme={theme} isDark={isDark} />
        </View>
      ) : (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={theme.error} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No files to display</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  navBack: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  navCenter: {
    flex: 1,
    gap: 2,
  },
  navTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  navSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  navAction: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  tabScroll: {
    borderBottomWidth: 1,
  },
  tabScrollContent: {
    paddingHorizontal: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLangDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  fileInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  fileInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fileInfoText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  fileInfoDivider: {
    width: 1,
    height: 12,
  },
  langBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  langBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyBtnText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  code: {
    fontSize: 12,
    lineHeight: 20,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  templateInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  templateInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  templateInfoText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  templateFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  generateBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
