import { View, Text, Pressable, StyleSheet } from "react-native";
import CustomBottomSheet from "../common/CustomBottomSheet";
import { colors } from "../../utils/colors";

export default function CharacterDiscoverActionsSheet({
  visible,
  characterName,
  hasCreator,
  onClose,
  onViewCharacter,
  onViewCreator,
  onBlockCharacter,
  onReportCharacter,
}: {
  visible: boolean;
  characterName: string;
  hasCreator: boolean;
  onClose: () => void;
  onViewCharacter: () => void;
  onViewCreator?: () => void;
  onBlockCharacter: () => void;
  onReportCharacter: () => void;
}) {
  return (
    <CustomBottomSheet visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>{characterName}</Text>

        <Pressable
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
          onPress={() => {
            onClose();
            onViewCharacter();
          }}
        >
          <Text style={styles.optionText}>View Character</Text>
        </Pressable>

        {hasCreator && onViewCreator ? (
          <Pressable
            style={({ pressed }) => [
              styles.option,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              onClose();
              onViewCreator();
            }}
          >
            <Text style={styles.optionText}>View Creator</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
          onPress={() => {
            onClose();
            onBlockCharacter();
          }}
        >
          <Text style={[styles.optionText, styles.dangerText]}>
            Block Character
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
          onPress={() => {
            onClose();
            onReportCharacter();
          }}
        >
          <Text style={[styles.optionText, styles.dangerText]}>
            Report Character
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
