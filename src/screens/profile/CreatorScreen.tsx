import React, {
  useEffect,
  useReducer,
  useCallback,
  useRef,
  useMemo,
  useState,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  RefreshControl,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  useRoute,
  useNavigation,
  type RouteProp,
} from "@react-navigation/native";
import Avatar from "../../components/common/Avatar";
import CharacterCard from "../../components/character/CharacterCard";
import { getProfile } from "../../api/profile";
import { getCharacters } from "../../api/characters";
import { stripHtml } from "../../utils/markdown";
import { assetUrl, avatarUrl } from "../../utils/assets";
import { colors } from "../../utils/colors";
import type {
  UserProfile,
  TrendingCharacter,
  TrendingResponse,
} from "../../types/api";
import type { CharactersStackParamList } from "../../navigation/types";

type Route = RouteProp<CharactersStackParamList, "CreatorScreen">;

interface ListState {
  characters: TrendingCharacter[];
  page: number;
  loading: boolean;
  refreshing: boolean;
  total: number;
  error: string | null;
}

type ListAction =
  | { type: "LOADING" }
  | { type: "REFRESHING" }
  | {
      type: "LOADED";
      payload: { data: TrendingCharacter[]; total: number; page: number };
    }
  | { type: "ERROR"; payload: string };

function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case "LOADING":
      return { ...state, loading: true, error: null };
    case "REFRESHING":
      return { ...state, refreshing: true, error: null };
    case "LOADED": {
      const { data, total, page } = action.payload;
      return {
        ...state,
        characters: page === 1 ? data : [...state.characters, ...data],
        total,
        page,
        loading: false,
        refreshing: false,
        error: null,
      };
    }
    case "ERROR":
      return {
        ...state,
        loading: false,
        refreshing: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

export default function CreatorScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const { navigate, goBack } = navigation;
  const { userId } = route.params;

  const characterScreenName = useMemo(() => {
    try {
      const routes = navigation.getParent()?.getState()?.routeNames ?? [];
      return routes.includes("ChatCharacter")
        ? "ChatCharacter"
        : "CharacterScreen";
    } catch {
      return "CharacterScreen";
    }
  }, [navigation.getParent]);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  const [list, dispatch] = useReducer(listReducer, {
    characters: [],
    page: 1,
    loading: true,
    refreshing: false,
    total: 0,
    error: null,
  });
  const pageRef = useRef(1);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getProfile(userId);
        setProfile(profile);
      } catch (err: any) {
        setProfileError(err.message || "Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const doFetch = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (isRefresh) dispatch({ type: "REFRESHING" });
      else dispatch({ type: "LOADING" });

      try {
        const response: TrendingResponse = await getCharacters({
          page: pageNum,
          sort: "latest",
          user_id: [userId],
        });
        dispatch({
          type: "LOADED",
          payload: {
            data: response.data,
            total: response.total,
            page: pageNum,
          },
        });
        pageRef.current = pageNum;
      } catch (err: any) {
        dispatch({ type: "ERROR", payload: err.message });
      }
    },
    [userId],
  );

  useEffect(() => {
    doFetch(1);
  }, [doFetch]);

  const handleLoadMore = useCallback(() => {
    if (!list.loading && list.characters.length < list.total) {
      doFetch(pageRef.current + 1);
    }
  }, [list.loading, list.characters.length, list.total, doFetch]);

  const handleRefresh = useCallback(() => {
    doFetch(1, true);
  }, [doFetch]);

  const renderItem = useCallback(
    ({ item }: { item: TrendingCharacter }) => (
      <CharacterCard
        character={item}
        onPress={() =>
          navigate(characterScreenName, {
            characterId: item.id,
            characterName: item.name,
          })
        }
      />
    ),
    [navigate, characterScreenName],
  );

  if (profileLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (profileError || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {profileError || "Profile not found"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.backBtn} onPress={goBack}>
        <Text style={styles.backText}>{"\u2190"} Back</Text>
      </Pressable>
      <FlashList
        data={list.characters}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        style={styles.flashlist}
        refreshControl={
          <RefreshControl
            refreshing={list.refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.profileSection}>
            <Avatar
              uri={profile.avatar ? avatarUrl(profile.avatar) : undefined}
              name={profile.name}
              size={80}
            />
            <Text style={styles.profileName}>{profile.name}</Text>
            {profile.user_name ? (
              <Text style={styles.profileUsername}>@{profile.user_name}</Text>
            ) : null}
            {profile.is_verified && (
              <Text style={styles.profileVerified}>{"\u2713"} Verified</Text>
            )}
            {profile.subscriber_badge && (
              <View style={styles.subBadge}>
                <Text style={styles.subBadgeText}>Subscriber</Text>
              </View>
            )}
            {profile.about_me ? (
              <View style={styles.aboutSection}>
                <View style={!aboutExpanded && styles.aboutCollapsed}>
                  <Text style={styles.profileAbout}>
                    {stripHtml(profile.about_me)}
                  </Text>
                </View>
                <Pressable
                  style={styles.showMoreBtn}
                  onPress={() => setAboutExpanded((e) => !e)}
                >
                  <Text style={styles.showMoreText}>
                    {aboutExpanded ? "Show less" : "Show more"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {profile.badges && profile.badges.length > 0 && (
              <View style={styles.badgesRow}>
                {profile.badges.map((b) => (
                  <View key={b.id} style={styles.badge}>
                    <Avatar uri={assetUrl(b.img)} size={24} />
                    <Text style={styles.badgeTitle}>{b.title}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{list.total}</Text>
                <Text style={styles.statLabel}>Characters</Text>
              </View>
            </View>
          </View>
        }
        ListFooterComponent={
          list.loading && list.characters.length > 0 ? (
            <ActivityIndicator
              style={styles.footerLoader}
              color={colors.accent}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backBtn: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 8 },
  backText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  listContent: { paddingBottom: 80 },
  flashlist: { flex: 1 },
  profileSection: { alignItems: "center", padding: 20, paddingTop: 60 },
  profileName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    marginTop: 12,
  },
  profileUsername: { color: colors.textDim, fontSize: 14, marginTop: 2 },
  profileVerified: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  subBadge: {
    backgroundColor: colors.accentFaded,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(124, 92, 231, 0.3)",
  },
  subBadgeText: { color: colors.accent, fontSize: 11, fontWeight: "600" },
  profileAbout: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  aboutSection: {
    width: "100%",
    marginTop: 12,
    alignItems: "center",
  },
  aboutCollapsed: {
    maxHeight: 300,
    overflow: "hidden",
  },
  showMoreBtn: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  showMoreText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeTitle: { color: colors.textSecondary, fontSize: 13 },
  statsRow: { marginTop: 16 },
  statItem: { alignItems: "center" },
  statValue: { color: colors.text, fontSize: 20, fontWeight: "700" },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  footerLoader: { paddingVertical: 20 },
  errorText: { color: colors.danger, fontSize: 16 },
});
