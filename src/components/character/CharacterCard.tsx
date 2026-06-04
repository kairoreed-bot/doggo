import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MessageCircle, MessageSquare } from "lucide-react-native";
import Avatar from "../common/Avatar";
import AvatarPreview from "../common/AvatarPreview";
import Tag from "../common/Tag";
import Badge from "../common/Badge";
import { colors } from "../../utils/colors";
import { botAvatarUrl } from "../../utils/assets";
import type { TrendingCharacter } from "../../types/api";

export default function CharacterCard({
  character,
  onPress,
}: {
  character: TrendingCharacter;
  onPress: () => void;
}) {
  const [preview, setPreview] = useState<{ uri: string; name: string } | null>(
    null,
  );
  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onPress}
      >
        <View style={styles.info}>
          <View style={styles.infoTop}>
            <Avatar
              uri={botAvatarUrl(character.avatar)}
              onPress={() =>
                setPreview({
                  uri: botAvatarUrl(character.avatar),
                  name: character.name,
                })
              }
              name={character.name}
              size={76}
            />
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {character.name}
              </Text>
              <Text style={[styles.creator]} numberOfLines={1}>
                by {character.creator_name}
                {character.creator_verified ? " \u2713" : ""}
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MessageCircle size={12} color={colors.textDim} />
                  <Text style={styles.stat}>
                    {character.stats.chat.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MessageSquare size={12} color={colors.textDim} />
                  <Text style={styles.stat}>
                    {character.stats.message.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.info}>
            {(character.tags.length > 0 ||
              character.custom_tags.length > 0) && (
              <View style={styles.tagsRow}>
                <Badge
                  label={character.is_nsfw ? "NSFW" : "Safe"}
                  variant={character.is_nsfw ? "nsfw" : "safe"}
                />
                {character.is_proxy_enabled && <Badge label="Proxy" />}
                {!character.is_public && <Badge label="Private" variant="private" />}
                {character.tags.map((tag) => (
                  <Tag key={tag.id} label={tag.name} compact />
                ))}
                {character.custom_tags.map((tag, _) => (
                  <Tag
                    key={`custom-${tag}`}
                    label={tag}
                    variant="custom"
                    compact
                  />
                ))}
              </View>
            )}
          </View>
        </View>
      </Pressable>
      <AvatarPreview
        visible={preview !== null}
        uri={preview?.uri ?? ""}
        onClose={() => setPreview(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  info: {
    flex: 1,
  },
  infoTop: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  creator: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 6,
  },
  creatorLink: {
    color: colors.accent,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  stat: {
    color: colors.textDim,
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
});
