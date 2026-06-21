import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import CustomBottomSheet from "../common/CustomBottomSheet";
import { colors } from "../../utils/colors";

function CharacterMenuSheet({
  visible,
  isOwner,
  onClose,
  onViewCreator,
  onOpenSettings,
  onEditCharacter,
  onDeleteCharacter,
  onCopyCharacter,
  onReportCharacter,
}: {
  visible: boolean;
  isOwner: boolean;
  onClose: () => void;
  onViewCreator: () => void;
  onOpenSettings: () => void;
  onEditCharacter: () => void;
  onDeleteCharacter: () => void;
  onCopyCharacter: () => void;
  onReportCharacter: () => void;
}) {
  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      <ScrollView>
        <Pressable onPress={onViewCreator} style={styles.item}>
          <Text style={styles.text}>View Creator</Text>
        </Pressable>
        {isOwner ? (
          <>
            <Pressable onPress={onOpenSettings} style={styles.item}>
              <Text style={styles.text}>Character Settings</Text>
            </Pressable>
            <Pressable onPress={onEditCharacter} style={styles.item}>
              <Text style={styles.text}>Edit Character</Text>
            </Pressable>
            <Pressable onPress={onDeleteCharacter} style={styles.item}>
              <Text style={[styles.text, styles.danger]}>
                Delete Character
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={onCopyCharacter} style={styles.item}>
              <Text style={styles.text}>Copy Character</Text>
            </Pressable>
            <Pressable onPress={onReportCharacter} style={styles.item}>
              <Text style={[styles.text, styles.danger]}>
                Report Character
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </CustomBottomSheet>
  );
}

export default memo(CharacterMenuSheet);

const styles = StyleSheet.create({
  item: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  danger: {
    color: colors.danger,
  },
});
