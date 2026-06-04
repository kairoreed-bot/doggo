import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { colors } from "../../utils/colors";

export default function CollapsibleSection({
  title,
  defaultExpanded = false,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (defaultExpanded && expanded) {
      progress.value = 1;
    }
  }, [defaultExpanded, expanded, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: progress.value }],
    transformOrigin: "top",
    overflow: "hidden" as const,
    opacity: progress.value,
  }));

  const toggle = useCallback(() => {
    if (expanded) {
      progress.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          scheduleOnRN(setExpanded, false);
        }
      });
    } else {
      setExpanded(true);
      progress.value = withTiming(1, { duration: 250 });
    }
  }, [expanded, progress]);

  return (
    <View style={styles.section}>
      <Pressable
        style={({ pressed }) => [
          styles.sectionHeader,
          expanded && styles.sectionHeaderExpanded,
          pressed && { opacity: 0.7 },
        ]}
        onPress={toggle}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionChevron}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>
      <View style={{ height: expanded ? "auto" : 0, overflow: "hidden" }}>
        <Animated.View style={[styles.sectionBody, animatedStyle]}>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 16, width: "100%" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionHeaderExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  sectionChevron: { color: colors.textFaint, fontSize: 10 },
  sectionBody: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
});
