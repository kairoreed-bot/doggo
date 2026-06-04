import { View, Text, Pressable, StyleSheet } from "react-native";
import CustomBottomSheet from "../common/CustomBottomSheet";
import { colors } from "../../utils/colors";

export default function ChatEntryActions({
  visible,
  onClose,
  onViewCharacter,
  onViewCreator,
  onNewChat,
  onAllChats,
  onDelete,
  characterName,
}: {
  visible: boolean;
  onClose: () => void;
  onViewCharacter: () => void;
  onViewCreator?: () => void;
  onNewChat: () => void;
  onAllChats: () => void;
  onDelete: () => void;
  characterName: string;
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

        {onViewCreator ? (
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
            onNewChat();
          }}
        >
          <Text style={styles.optionText}>New Chat</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
          onPress={() => {
            onClose();
            onAllChats();
          }}
        >
          <Text style={styles.optionText}>All Chats</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.option, pressed && { opacity: 0.7 }]}
          onPress={() => {
            onClose();
            onDelete();
          }}
        >
          <Text style={[styles.optionText, styles.deleteText]}>
            Delete Chat
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
  deleteText: {
    color: colors.danger,
  },
});
