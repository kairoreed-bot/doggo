import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { Modal, Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

export const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: "Trending 24h", value: "trending24" },
  { label: "Trending", value: "trending" },
  { label: "Popular", value: "popular" },
  { label: "Latest", value: "latest" },
  { label: "Relevance", value: "relevance" },
];

export interface SortModalHandle {
  open: () => void;
}

export default forwardRef<
  SortModalHandle,
  { currentSort: string; onSelect: (value: string) => void }
>(({ currentSort, onSelect }, ref) => {
  const [visible, setVisible] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setVisible(true),
  }));

  const handleSelect = useCallback(
    (value: string) => {
      setVisible(false);
      onSelect(value);
    },
    [onSelect],
  );

  const handleClose = useCallback(() => setVisible(false), []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.content} onPress={() => {}}>
          <Text style={styles.title}>Sort by</Text>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.option,
                opt.value === currentSort && styles.optionSelected,
              ]}
              onPress={() => handleSelect(opt.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  opt.value === currentSort && styles.optionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    width: "85%",
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionSelected: {
    backgroundColor: colors.accentFaded,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: "600",
  },
});
