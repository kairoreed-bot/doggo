import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { colors } from "../../utils/colors";

export default function ThinkingBlock({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  const opacity = useSharedValue(1);

  const thinkingContent = useMemo(() => {
    const matches = [...message.matchAll(/<thinking>([\s\S]*?)<\/thinking>/g)];
    if (matches.length === 0) return null;
    return matches.map((m) => m[1].trim()).join("\n\n");
  }, [message]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (!expanded && thinkingContent) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
      );
      return () => {
        opacity.value = 1;
      };
    } else {
      opacity.value = 1;
    }
  }, [expanded, thinkingContent, opacity]);

  if (!thinkingContent) return null;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.7 }]}
      >
        <Animated.View style={[styles.dot, animatedStyle]} />
        <Text style={styles.headerText}>
          {expanded ? "Thinking" : "Thinking\u2026"}
        </Text>
        <Text style={styles.chevron}>{expanded ? "\u25B2" : "\u25BC"}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.content}>
          <Text style={styles.contentText}>{thinkingContent}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.accentFadedLight,
    borderRadius: 8,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  headerText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  chevron: {
    color: colors.accent,
    fontSize: 10,
  },
  content: {
    padding: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  contentText: {
    color: colors.textPlaceholder,
    fontSize: 13,
    lineHeight: 19,
  },
});
