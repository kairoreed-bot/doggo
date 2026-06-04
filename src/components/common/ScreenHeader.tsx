import type React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

export default function ScreenHeader({
  title,
  onBack,
  rightElement,
}: {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>{"←"}</Text>
      </Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {rightElement ?? <View style={styles.backBtn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: { color: colors.accent, fontSize: 24, fontWeight: "600" },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
});
