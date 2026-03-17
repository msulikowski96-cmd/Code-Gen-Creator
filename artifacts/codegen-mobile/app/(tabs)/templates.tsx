import React from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useListTemplates } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const SPEC_TYPE_COLORS = {
  NativeModule: { bg: "rgba(88,166,255,0.1)", text: "#58A6FF", border: "rgba(88,166,255,0.25)" },
  NativeComponent: { bg: "rgba(63,185,80,0.1)", text: "#3FB950", border: "rgba(63,185,80,0.25)" },
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {};

function TemplateCard({
  item,
  theme,
  isDark,
  onPress,
}: {
  item: {
    id: string;
    name: string;
    description: string;
    specType: "NativeModule" | "NativeComponent";
    moduleName: string;
    spec: string;
  };
  theme: typeof Colors.dark;
  isDark: boolean;
  onPress: () => void;
}) {
  const colors = SPEC_TYPE_COLORS[item.specType];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.iconBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Ionicons
            name={item.specType === "NativeModule" ? "cube-outline" : "layers-outline"}
            size={20}
            color={colors.text}
          />
        </View>
        <View style={styles.cardMeta}>
          <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
          <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>{item.specType}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
      <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={[styles.moduleRow, { borderTopColor: theme.borderSubtle }]}>
        <Feather name="terminal" size={12} color={theme.textMuted} />
        <Text style={[styles.moduleText, { color: theme.textMuted }]}>{item.moduleName}</Text>
      </View>
    </Pressable>
  );
}

export default function TemplatesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, refetch } = useListTemplates();

  const handleSelectTemplate = (item: {
    id: string;
    name: string;
    description: string;
    specType: "NativeModule" | "NativeComponent";
    moduleName: string;
    spec: string;
  }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/result",
      params: {
        fromTemplate: "1",
        templateId: item.id,
        moduleName: item.moduleName,
        specType: item.specType,
        spec: item.spec,
        templateName: item.name,
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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Templates</Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          Start from a pre-built spec
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={32} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.textSecondary }]}>Failed to load templates</Text>
          <Pressable onPress={() => refetch()} style={[styles.retryBtn, { backgroundColor: theme.primaryMuted }]}>
            <Text style={[styles.retryBtnText, { color: theme.primary }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.templates ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <TemplateCard
              item={item}
              theme={theme}
              isDark={isDark}
              onPress={() => handleSelectTemplate(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="inbox" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No templates found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
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
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: 1,
  },
  moduleText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
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
