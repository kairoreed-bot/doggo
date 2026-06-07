import { useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ThumbsUp, Trash2, BadgeCheck, Shield } from "lucide-react-native";
import Avatar from "../common/Avatar";
import type { ReviewComment } from "../../types/api";
import {
  likeComment,
  deleteComment as deleteCommentApi,
} from "../../api/reviews";
import { useAuthStore } from "../../stores/authStore";
import { colors } from "../../utils/colors";
import { avatarUrl } from "../../utils/assets";
import { formatRelativeTime } from "../../utils/time";

export default function CommentItem({
  comment: initialComment,
  onDelete,
  onLikeToggled,
}: {
  comment: ReviewComment;
  onDelete: (id: string) => void;
  onLikeToggled: (id: string, isLiked: boolean) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<any>();
  const [comment, setComment] = useState(initialComment);
  const [liking, setLiking] = useState(false);

  const isOwnComment = comment.user_id === user?.id;
  const profile = comment.user_profiles;
  const iconSize = 12;

  const handleLike = useCallback(async () => {
    if (liking) return;
    setLiking(true);
    const wasLiked = comment.is_liked_by_user;
    const newIsLiked = !wasLiked;
    setComment((prev) => ({
      ...prev,
      is_liked_by_user: newIsLiked,
      like_count: wasLiked ? prev.like_count - 1 : prev.like_count + 1,
    }));
    onLikeToggled(comment.id, newIsLiked);
    try {
      await likeComment(comment.id);
    } catch {
      setComment((prev) => ({
        ...prev,
        is_liked_by_user: wasLiked,
        like_count: wasLiked ? prev.like_count + 1 : prev.like_count - 1,
      }));
      onLikeToggled(comment.id, wasLiked);
    } finally {
      setLiking(false);
    }
  }, [comment.id, comment.is_liked_by_user, liking, onLikeToggled]);

  const handleDelete = useCallback(async () => {
    try {
      await deleteCommentApi(comment.id);
      onDelete(comment.id);
    } catch {
      // silently fail
    }
  }, [comment.id, onDelete]);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() =>
          navigation.navigate("CreatorScreen", {
            userId: comment.user_id,
            userName: profile.name || profile.user_name,
          })
        }
      >
        <Avatar
          uri={profile.avatar ? avatarUrl(profile.avatar) : ""}
          name={profile.name || profile.user_name}
          size={28}
        />
      </Pressable>
      <View style={styles.body}>
        <Pressable
          style={styles.header}
          onPress={() =>
            navigation.navigate("CreatorScreen", {
              userId: comment.user_id,
              userName: profile.name || profile.user_name,
            })
          }
        >
          <Text style={styles.userName}>
            {profile.name || profile.user_name}
          </Text>
          {profile.is_verified && (
            <BadgeCheck size={12} color={colors.accent} />
          )}
          {comment.moderator && (
            <View style={styles.moderatorBadge}>
              <Shield size={8} color={colors.danger} />
            </View>
          )}
          <Text style={styles.time}>
            {formatRelativeTime(comment.created_at)}
          </Text>
        </Pressable>
        <Text style={styles.content}>{comment.content}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={handleLike}
            disabled={liking}
            style={styles.likeBtn}
          >
            <ThumbsUp
              size={iconSize}
              color={comment.is_liked_by_user ? colors.accent : colors.textDim}
            />
            {comment.like_count > 0 && (
              <Text
                style={[
                  styles.likeText,
                  comment.is_liked_by_user && styles.likeTextActive,
                ]}
              >
                {comment.like_count}
              </Text>
            )}
          </Pressable>
          {isOwnComment && (
            <Pressable onPress={handleDelete}>
              <Trash2 size={iconSize} color={colors.danger} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 6,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  userName: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  moderatorBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
  },
  time: {
    color: colors.textDim,
    fontSize: 11,
  },
  content: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  likeText: {
    color: colors.textDim,
    fontSize: 11,
  },
  likeTextActive: {
    color: colors.accent,
  },
});
