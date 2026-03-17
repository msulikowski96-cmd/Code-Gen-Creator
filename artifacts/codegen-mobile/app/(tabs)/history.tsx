import React from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
  useListHistory,
  useClearHistory,
  getListHistoryQueryKey,
} from "@workspace/api-client-react";
import Colors from "@/constants/colors";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

const PLATFORM_COLORS: Record<string, string> = {
  android: "#3DDC84",
  ios: "#007AFF",
  both: "#F0883E",
};

const PLATFORM_LABELS: Record<string, string> = {
  android: "Android",
  ios: "iOS",
  both: "Both",
};

interface HistoryItemData {
  id: number;
  moduleName: string;
  specType: "NativeModule" | "NativeComponent";
  platform: "android" | "ios" | "both";
  generatedAt: string;
  fileCount: number;
}

function HistoryRow({
  item,
  theme,
  onPress,
}: {
  item: HistoryItemData;
  theme: typeof Colors.dark;
  onPress: () => void;
}) {
  const platformColor = PLATFORM_COLORS[item.platform] ?? theme.primary;
  const isModule = item.specType === "NativeModule";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: isModule ? Colors.dark.primaryMuted : Colors.dark.greenMuted },
        ]}
      >
        <Ionicons
          name={isModule ? "cube-outline" : "layers-outline"}
          size={18}
          color={isModule ? theme.primary : theme.green}
        />
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTitleRow}>
          <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={1}>
            {item.moduleName}
          </Text>
          <View style={[styles.platformDot, { backgroundColor: platformColor }]} />
          <Text style={[styles.platformLabel, { color: platformColor }]}>
            {PLATFORM_LABELS[item.platform]}
          </Text>
        </View>
        <View style={styles.rowMeta}>
          <Text style={[styles.rowMetaText, { color: theme.textMuted }]}>
            {item.specType}
          </Text>
          <View style={[styles.metaDot, { backgroundColor: theme.textMuted }]} />
          <Text style={[styles.rowMetaText, { color: theme.textMuted }]}>
            {item.fileCount} {item.fileCount === 1 ? "file" : "files"}
          </Text>
          <View style={[styles.metaDot, { backgroundColor: theme.textMuted }]} />
          <Text style={[styles.rowMetaText, { color: theme.textMuted }]}>
            {formatDate(item.generatedAt)}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useListHistory();
  const clearMutation = useClearHistory();

  const items = (data?.items ?? []) as HistoryItemData[];
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );

  const handleClearAll = () => {
    Alert.alert("Clear History", "Delete all generation history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await clearMutation.mutateAsync();
          queryClient.invalidateQueries({ queryKey: getListHistoryQueryKey() });
        },
      },
    ]);
  };

  const handleOpenItem = async (item: HistoryItemData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/result",
      params: {
        id: String(item.id),
        fromHistory: "1",
      },
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>History</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {sortedItems.length} generation{sortedItems.length !== 1 ? "s" : ""}
          </Text>
        </View>
        {sortedItems.length > 0 && (
          <Pressable
            onPress={handleClearAll}
            style={({ pressed }) => [
              styles.clearBtn,
              { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather name="trash-2" size={14} color={theme.error} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={theme.error} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Failed to load history</Text>
          <Pressable
            onPress={() => refetch()}
            style={[styles.retryBtn, { backgroundColor: theme.primaryMuted }]}
          >
            <Text style={[styles.retryBtnText, { color: theme.primary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : sortedItems.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Feather name="clock" size={28} color={theme.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No history yet</Text>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Generated code will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <HistoryRow item={item} theme={theme} onPress={() => handleOpenItem(item)} />
          )}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  platformDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  platformLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  rowMetaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 220,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
