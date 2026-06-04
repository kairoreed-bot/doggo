import { Modal, Pressable, Image, Text, View, StyleSheet } from "react-native";
import { colors } from "../../utils/colors";

export default function AvatarPreview({
  visible,
  uri,
  onClose,
}: {
  visible: boolean;
  uri: string;
  onClose: () => void;
}) {
  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    // aspectRatio: .5,
    borderRadius: 16,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
});
