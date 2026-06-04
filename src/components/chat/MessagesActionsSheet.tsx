import { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import CustomBottomSheet from "../common/CustomBottomSheet";
import { colors } from "../../utils/colors";

export default function MessagesActionsSheet({
  visible,
  onClose,
  onExport,
  onImport,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: () => void;
  onReset: () => void;
}) {
  const optionStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => [
      styles.option,
      pressed && { opacity: 0.7 },
    ],
    [],
  );

  const handleExport = useCallback(() => {
    onClose();
    onExport();
  }, [onClose, onExport]);

  const handleImport = useCallback(() => {
    onClose();
    onImport();
  }, [onClose, onImport]);

  const handleReset = useCallback(() => {
    onClose();
    onReset();
  }, [onClose, onReset]);

  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>Messages Actions</Text>

        <Pressable style={optionStyle} onPress={handleExport}>
          <Text style={styles.optionText}>Export Messages</Text>
        </Pressable>

        <Pressable style={optionStyle} onPress={handleImport}>
          <Text style={[styles.optionText, styles.dangerText]}>
            Import Messages
          </Text>
        </Pressable>

        <Pressable style={optionStyle} onPress={handleReset}>
          <Text style={[styles.optionText, styles.dangerText]}>
            Reset Messages
          </Text>
        </Pressable>
      </View>
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 4,
  },
  option: {
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "500",
  },
  dangerText: {
    color: colors.danger,
  },
});
