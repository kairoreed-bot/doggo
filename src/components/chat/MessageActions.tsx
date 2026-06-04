import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import CustomBottomSheet from "../common/CustomBottomSheet";
import { colors } from "../../utils/colors";

export default function MessageActions({
  visible,
  onClose,
  onEdit,
  onDelete,
  onReroll,
  onCopy,
  onFork,
  onRerollMessage,
  onReformat,
  canEdit,
  canDelete,
  canReroll,
  canFork,
  canRerollMessage,
  canReformat,
}: {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReroll?: () => void;
  onCopy?: () => void;
  onFork?: () => void;
  onRerollMessage?: () => void;
  onReformat?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canReroll?: boolean;
  canFork?: boolean;
  canRerollMessage?: boolean;
  canReformat?: boolean;
}) {
  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        {onCopy && (
          <Pressable
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              onCopy();
              onClose();
            }}
          >
            <Text style={styles.optionText}>Copy Message</Text>
          </Pressable>
        )}
        {canEdit && (
          <Pressable
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onEdit}
          >
            <Text style={styles.optionText}>Edit Message</Text>
          </Pressable>
        )}
        {canReformat && onReformat && (
          <Pressable
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              onReformat();
              onClose();
            }}
          >
            <Text style={styles.optionText}>Reformat Markdown</Text>
          </Pressable>
        )}
        {canRerollMessage && onRerollMessage && (
          <Pressable
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              onRerollMessage();
              onClose();
            }}
          >
            <Text style={styles.optionText}>Reroll message</Text>
          </Pressable>
        )}
        {canFork && onFork && (
          <Pressable
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              onFork();
              onClose();
            }}
          >
            <Text style={styles.optionText}>Fork Chat</Text>
          </Pressable>
        )}
        {canReroll && onReroll && (
          <Pressable
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              onReroll();
              onClose();
            }}
          >
            <Text style={styles.optionText}>Reroll</Text>
          </Pressable>
        )}
        {canDelete && (
          <Pressable
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              onDelete();
              onClose();
            }}
          >
            <Text style={[styles.optionText, styles.deleteText]}>
              Delete Message
            </Text>
          </Pressable>
        )}
      </View>
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
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
  deleteText: {
    color: colors.danger,
  },
});
