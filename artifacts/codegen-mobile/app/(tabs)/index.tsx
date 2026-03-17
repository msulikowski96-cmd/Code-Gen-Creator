import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useGenerateCode } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const SPEC_TYPE_OPTIONS = [
  { value: "NativeModule", label: "Module", icon: "cube-outline" as const },
  { value: "NativeComponent", label: "Component", icon: "layers-outline" as const },
];

const PLATFORM_OPTIONS = [
  { value: "android", label: "Android", icon: "logo-android" as const },
  { value: "ios", label: "iOS", icon: "logo-apple" as const },
  { value: "both", label: "Both", icon: "phone-portrait-outline" as const },
];

const DEFAULT_MODULE_SPEC = `import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  multiply(a: number, b: number): Promise<number>;
  getString(key: string): Promise<string>;
  setString(key: string, value: string): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>(
  'MyModule',
);`;

const DEFAULT_COMPONENT_SPEC = `import type { ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeProps extends ViewProps {
  color: string;
  size: number;
  enabled: boolean;
  onPress: string;
}

export default codegenNativeComponent<NativeProps>(
  'MyComponent',
);`;

export default function StudioScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [moduleName, setModuleName] = useState("MyModule");
  const [specType, setSpecType] = useState<"NativeModule" | "NativeComponent">("NativeModule");
  const [platform, setPlatform] = useState<"android" | "ios" | "both">("both");
  const [spec, setSpec] = useState(DEFAULT_MODULE_SPEC);

  const generateMutation = useGenerateCode();

  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleSpecTypeChange = (val: "NativeModule" | "NativeComponent") => {
    if (val === specType) return;
    setSpecType(val);
    setSpec(val === "NativeModule" ? DEFAULT_MODULE_SPEC : DEFAULT_COMPONENT_SPEC);
    if (val === "NativeComponent") setModuleName("MyComponent");
    else setModuleName("MyModule");
    Haptics.selectionAsync();
  };

  const handlePlatformChange = (val: "android" | "ios" | "both") => {
    setPlatform(val);
    Haptics.selectionAsync();
  };

  const handleGenerate = async () => {
    if (!moduleName.trim()) {
      Alert.alert("Module Name Required", "Please enter a module or component name.");
      return;
    }
    if (!spec.trim()) {
      Alert.alert("Spec Required", "Please enter a TypeScript spec.");
      return;
    }

    buttonScale.value = withSpring(0.96, { duration: 100 }, () => {
      buttonScale.value = withSpring(1, { duration: 100 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const result = await generateMutation.mutateAsync({
        data: {
          moduleName: moduleName.trim(),
          specType,
          platform,
          spec,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: "/result",
        params: {
          id: String(result.id),
          moduleName: result.moduleName,
          specType: result.specType,
          platform: result.platform,
          files: JSON.stringify(result.files),
        },
      });
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Generation Failed", "Something went wrong. Please try again.");
    }
  };

  const styles = makeStyles(theme, isDark);

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Codegen Studio</Text>
          <Text style={styles.headerSubtitle}>React Native New Architecture</Text>
        </View>
        <View style={styles.headerBadge}>
          <View style={styles.dot} />
          <Text style={styles.headerBadgeText}>SDK 54</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Module Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Module Name</Text>
          <TextInput
            style={styles.input}
            value={moduleName}
            onChangeText={setModuleName}
            placeholder="e.g. Camera, BiometricAuth"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
          />
        </View>

        {/* Spec Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Spec Type</Text>
          <View style={styles.segmentRow}>
            {SPEC_TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handleSpecTypeChange(opt.value as "NativeModule" | "NativeComponent")}
                style={[
                  styles.segmentBtn,
                  specType === opt.value && styles.segmentBtnActive,
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={16}
                  color={specType === opt.value ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    specType === opt.value && styles.segmentBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Platform */}
        <View style={styles.section}>
          <Text style={styles.label}>Target Platform</Text>
          <View style={styles.platformRow}>
            {PLATFORM_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => handlePlatformChange(opt.value as "android" | "ios" | "both")}
                style={[
                  styles.platformBtn,
                  platform === opt.value && styles.platformBtnActive,
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={platform === opt.value ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.platformBtnText,
                    platform === opt.value && styles.platformBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Spec Editor */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>TypeScript Spec</Text>
            <View style={styles.tsBadge}>
              <Text style={styles.tsBadgeText}>TS</Text>
            </View>
          </View>
          <View style={styles.codeEditorContainer}>
            <View style={styles.codeEditorHeader}>
              <View style={styles.trafficDots}>
                <View style={[styles.trafficDot, { backgroundColor: "#FF5F57" }]} />
                <View style={[styles.trafficDot, { backgroundColor: "#FEBC2E" }]} />
                <View style={[styles.trafficDot, { backgroundColor: "#28C840" }]} />
              </View>
              <Text style={styles.codeEditorFilename}>
                Native{specType === "NativeModule" ? "Module" : "Component"}.ts
              </Text>
            </View>
            <TextInput
              style={styles.codeEditor}
              value={spec}
              onChangeText={setSpec}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              placeholderTextColor={theme.textMuted}
            />
          </View>
        </View>
      </ScrollView>

      {/* Generate Button */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 12) },
        ]}
      >
        <Animated.View style={[{ flex: 1 }, buttonAnimStyle]}>
          <Pressable
            onPress={handleGenerate}
            disabled={generateMutation.isPending}
            style={[styles.generateBtn, generateMutation.isPending && styles.generateBtnDisabled]}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="play" size={18} color="#fff" />
            )}
            <Text style={styles.generateBtnText}>
              {generateMutation.isPending ? "Generating..." : "Generate Code"}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function makeStyles(theme: typeof Colors.dark, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: theme.textSecondary,
      marginTop: 1,
    },
    headerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: theme.primaryMuted,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: theme.primary + "30",
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    headerBadgeText: {
      fontSize: 11,
      fontFamily: "Inter_600SemiBold",
      color: theme.primary,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 24,
    },
    section: {
      gap: 10,
    },
    label: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: theme.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    input: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: "Inter_500Medium",
      color: theme.text,
    },
    segmentRow: {
      flexDirection: "row",
      gap: 10,
    },
    segmentBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    segmentBtnActive: {
      backgroundColor: theme.primaryMuted,
      borderColor: theme.primary + "60",
    },
    segmentBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: theme.textSecondary,
    },
    segmentBtnTextActive: {
      color: theme.primary,
      fontFamily: "Inter_600SemiBold",
    },
    platformRow: {
      flexDirection: "row",
      gap: 10,
    },
    platformBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    platformBtnActive: {
      backgroundColor: theme.primaryMuted,
      borderColor: theme.primary + "60",
    },
    platformBtnText: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: theme.textSecondary,
    },
    platformBtnTextActive: {
      color: theme.primary,
      fontFamily: "Inter_600SemiBold",
    },
    tsBadge: {
      backgroundColor: "#3178C6" + "20",
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    tsBadgeText: {
      fontSize: 10,
      fontFamily: "Inter_700Bold",
      color: "#3178C6",
    },
    codeEditorContainer: {
      borderRadius: 10,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
    },
    codeEditorHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: theme.surfaceElevated,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    trafficDots: {
      flexDirection: "row",
      gap: 5,
    },
    trafficDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    codeEditorFilename: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      color: theme.textSecondary,
    },
    codeEditor: {
      backgroundColor: theme.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 12.5,
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
      color: theme.text,
      minHeight: 220,
      textAlignVertical: "top",
      lineHeight: 20,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    generateBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 15,
    },
    generateBtnDisabled: {
      opacity: 0.6,
    },
    generateBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
      color: "#fff",
    },
  });
}
