import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Keyboard,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import ScreenHeader from "../../components/common/ScreenHeader";
import { colors } from "../../utils/colors";
import { getBlockedContent, updateBlockedContent } from "../../api/profile";
import { getTagSuggestions, getTags } from "../../api/characters";
import type { BlockedContent, CharacterTag } from "../../types/api";
import type { ProfileStackParamList } from "../../navigation/types";
import { scheduleOnRN } from "react-native-worklets";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "BlockedContent">;

type Tab = "creators" | "characters" | "tags";

const TABS: { key: Tab; label: string }[] = [
  { key: "creators", label: "Creators" },
  { key: "characters", label: "Characters" },
  { key: "tags", label: "Tags" },
];

const TAB_COUNT = TABS.length;

function tabIndex(tab: Tab): number {
  return TABS.findIndex((t) => t.key === tab);
}

export default function BlockedContentScreen() {
  const { goBack } = useNavigation<Nav>();

  const [activeTab, setActiveTab] = useState<Tab>("creators");
  const [blocked, setBlocked] = useState<BlockedContent>({
    bots: [],
    creators: [],
    keywords: [],
    tags: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTags, setAllTags] = useState<CharacterTag[]>([]);
  const [tagSearchValue, setTagSearchValue] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  const initialRef = useRef<BlockedContent | null>(null);
  const suggestTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reanimated shared values for swipeable tabs
  const tabIndicator = useSharedValue(0);
  const tabRowWidth = useSharedValue(1);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const screenWidth = Dimensions.get("window").width;

  const snapToTab = useCallback(
    (t: Tab) => {
      const idx = tabIndex(t);
      setActiveTab(t);
      translateX.value = withTiming(-idx * screenWidth, { duration: 250 });
      tabIndicator.value = withTiming(
        idx * (tabRowWidth.value / TAB_COUNT),
        { duration: 250 },
      );
    },
    [translateX, tabIndicator, tabRowWidth, screenWidth],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .onBegin(() => {
          startX.value = translateX.value;
        })
        .onUpdate((event) => {
          const maxOffset = -(TAB_COUNT - 1) * screenWidth;
          const raw = startX.value + event.translationX;
          const clamped = Math.max(maxOffset, Math.min(0, raw));
          translateX.value = clamped;
          const progress = -clamped / screenWidth;
          tabIndicator.value = (progress / TAB_COUNT) * tabRowWidth.value;
        })
        .onEnd((event) => {
          const velocity = event.velocityX ?? 0;
          const currentIdx = Math.round(-translateX.value / screenWidth);

          if (velocity > 300) {
            const target = Math.max(0, currentIdx - 1);
            scheduleOnRN(snapToTab, TABS[target].key);
          } else if (velocity < -300) {
            const target = Math.min(TAB_COUNT - 1, currentIdx + 1);
            scheduleOnRN(snapToTab, TABS[target].key);
          } else {
            const idx = Math.max(
              0,
              Math.min(TAB_COUNT - 1, currentIdx),
            );
            scheduleOnRN(snapToTab, TABS[idx].key);
          }
        }),
    [translateX, startX, tabIndicator, tabRowWidth, screenWidth, snapToTab],
  );

  const loadBlockedContent = useCallback(async () => {
    try {
      const [data, tags] = await Promise.all([
        getBlockedContent(),
        getTags(),
      ]);
      setBlocked(data);
      setAllTags(tags);
      initialRef.current = JSON.parse(JSON.stringify(data));
    } catch {
      Alert.alert("Error", "Failed to load blocked content");
    } finally {
      setLoading(false);
    }
  }, [])

  useEffect(() => {
    loadBlockedContent();
  }, [loadBlockedContent]);

  const hasChanges =
    initialRef.current !== null &&
    JSON.stringify(blocked) !== JSON.stringify(initialRef.current);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      await updateBlockedContent(blocked);
      initialRef.current = JSON.parse(JSON.stringify(blocked));
      Alert.alert("Saved", "Blocked content updated");
    } catch {
      Alert.alert("Error", "Failed to save blocked content");
    } finally {
      setSaving(false);
    }
  }, [blocked, hasChanges]);

  const handleAddKeyword = useCallback(
    (keyword: string) => {
      const trimmed = keyword.trim();
      if (!trimmed) return;
      if (blocked.keywords.includes(trimmed)) {
        setInputValue("");
        setShowSuggestions(false);
        return;
      }
      setBlocked((prev) => ({
        ...prev,
        keywords: [...prev.keywords, trimmed],
      }));
      setInputValue("");
      setShowSuggestions(false);
    },
    [blocked.keywords],
  );

  const handleRemoveCreator = useCallback((name: string) => {
    setBlocked((prev) => ({
      ...prev,
      creators: prev.creators.filter((c) => c !== name),
    }));
  }, []);

  const handleRemoveCharacter = useCallback((name: string) => {
    setBlocked((prev) => ({
      ...prev,
      bots: prev.bots.filter((b) => b !== name),
    }));
  }, []);

  const handleRemoveKeyword = useCallback((keyword: string) => {
    setBlocked((prev) => ({
      ...prev,
      keywords: prev.keywords.filter((k) => k !== keyword),
    }));
  }, []);

  const handleRemoveTag = useCallback((id: number) => {
    setBlocked((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== id),
    }));
  }, []);

  const filteredTagSuggestions = useMemo(() => {
    const q = tagSearchValue.trim().toLowerCase();
    if (q.length < 1) return [];
    return allTags
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) && !blocked.tags.includes(t.id),
      )
      .slice(0, 20);
  }, [tagSearchValue, allTags, blocked.tags]);

  const handleAddTag = useCallback(
    (tag: CharacterTag) => {
      setBlocked((prev) => ({
        ...prev,
        tags: [...prev.tags, tag.id],
      }));
      setTagSearchValue("");
      setShowTagSuggestions(false);
    },
    [],
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setInputValue(text);
      if (activeTab !== "tags") return;

      if (suggestTimeout.current) {
        clearTimeout(suggestTimeout.current);
      }

      const trimmed = text.trim();
      if (trimmed.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      suggestTimeout.current = setTimeout(async () => {
        try {
          const result = await getTagSuggestions(trimmed);
          setSuggestions(result.suggestions);
          setShowSuggestions(result.suggestions.length > 0);
        } catch {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }, 300);
    },
    [activeTab],
  );

  const handleSubmitKeyword = useCallback(() => {
    handleAddKeyword(inputValue);
  }, [handleAddKeyword, inputValue]);

  // Animated styles
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicator.value }],
  }));

  const contentTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleTabRowLayout = useCallback(
    (width: number) => {
      tabRowWidth.value = width;
      const idx = tabIndex(activeTab);
      tabIndicator.value = idx * (width / TAB_COUNT);
      translateX.value = -idx * screenWidth;
    },
    [activeTab, tabIndicator, translateX, tabRowWidth, screenWidth],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Blocked Content" onBack={() => goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Blocked Content"
        onBack={() => goBack()}
        rightElement={
          <Pressable
            onPress={handleSave}
            disabled={!hasChanges || saving}
            style={[styles.saveBtn, !hasChanges && styles.saveBtnDisabled]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text
                style={[
                  styles.saveBtnText,
                  !hasChanges && styles.saveBtnTextDisabled,
                ]}
              >
                Save
              </Text>
            )}
          </Pressable>
        }
      />

      {/* Tab bar */}
      <View
        style={styles.tabRow}
        onLayout={(e) => handleTabRowLayout(e.nativeEvent.layout.width)}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.tab}
              onPress={() => {
                snapToTab(tab.key);
                setInputValue("");
                setShowSuggestions(false);
                setTagSearchValue("");
                setShowTagSuggestions(false);
                Keyboard.dismiss();
              }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
        <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.contentSliding,
              { width: screenWidth * TAB_COUNT },
              contentTranslateStyle,
            ]}
          >
            {/* Creators Tab */}
            <ScrollView
              style={{ width: screenWidth }}
              contentContainerStyle={styles.contentInner}
              keyboardShouldPersistTaps="handled"
            >
              {blocked.creators.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No blocked creators</Text>
                </View>
              ) : (
                blocked.creators.map((name) => (
                  <View key={name} style={styles.itemRow}>
                    <Text style={styles.itemText}>{name}</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.removeBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleRemoveCreator(name)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Characters Tab */}
            <ScrollView
              style={{ width: screenWidth }}
              contentContainerStyle={styles.contentInner}
              keyboardShouldPersistTaps="handled"
            >
              {blocked.bots.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No blocked characters</Text>
                </View>
              ) : (
                blocked.bots.map((name) => (
                  <View key={name} style={styles.itemRow}>
                    <Text style={styles.itemText}>{name}</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.removeBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleRemoveCharacter(name)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Tags Tab */}
            <ScrollView
              style={{ width: screenWidth }}
              contentContainerStyle={styles.contentInner}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionTitle}>Custom Tags</Text>
              <View style={styles.addRow}>
                <View style={styles.autocompleteContainer}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Search custom tags..."
                    placeholderTextColor={colors.textDim}
                    value={inputValue}
                    onChangeText={handleInputChange}
                    onSubmitEditing={handleSubmitKeyword}
                    returnKeyType="done"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                  />
                  {showSuggestions && (
                    <View style={styles.suggestionsDropdown}>
                      <ScrollView
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        style={styles.suggestionsList}
                      >
                        {suggestions.map((s) => (
                          <Pressable
                            key={s}
                            style={({ pressed }) => [
                              styles.suggestionItem,
                              pressed && {
                                backgroundColor: colors.accentFaded,
                              },
                            ]}
                            onPress={() => handleAddKeyword(s)}
                          >
                            <Text style={styles.suggestionText}>{s}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.addBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={handleSubmitKeyword}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>

              {blocked.keywords.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No blocked custom tags</Text>
                </View>
              ) : (
                blocked.keywords.map((kw) => (
                  <View key={kw} style={styles.itemRow}>
                    <Text style={styles.itemText}>{kw}</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.removeBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                      onPress={() => handleRemoveKeyword(kw)}
                    >
                      <Text style={styles.removeBtnText}>✕</Text>
                    </Pressable>
                  </View>
                ))
              )}

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.addRow}>
                <View style={styles.autocompleteContainer}>
                  <TextInput
                    style={styles.addInput}
                    placeholder="Search tags..."
                    placeholderTextColor={colors.textDim}
                    value={tagSearchValue}
                    onChangeText={(text) => {
                      setTagSearchValue(text);
                      setShowTagSuggestions(text.trim().length > 0);
                    }}
                    returnKeyType="done"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onBlur={() => {
                      setTimeout(() => setShowTagSuggestions(false), 200);
                    }}
                  />
                  {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                    <View style={styles.suggestionsDropdown}>
                      <ScrollView
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        style={styles.suggestionsList}
                      >
                        {filteredTagSuggestions.map((tag) => (
                          <Pressable
                            key={String(tag.id)}
                            style={({ pressed }) => [
                              styles.suggestionItem,
                              pressed && {
                                backgroundColor: colors.accentFaded,
                              },
                            ]}
                            onPress={() => handleAddTag(tag)}
                          >
                            <Text style={styles.suggestionText}>
                              {tag.name}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {blocked.tags.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No blocked tags</Text>
                </View>
              ) : (
                blocked.tags.map((id) => {
                  const tag = allTags.find((t) => t.id === id);
                  return (
                    <View key={String(id)} style={styles.itemRow}>
                      <Text style={styles.itemText}>
                        {tag ? tag.name : `#${id}`}
                      </Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.removeBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => handleRemoveTag(id)}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </Pressable>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.accentFaded,
  },
  saveBtnDisabled: {
    backgroundColor: "transparent",
  },
  saveBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtnTextDisabled: {
    color: colors.textDim,
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    position: "relative",
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    width: "33.33%",
    height: 2,
    backgroundColor: colors.accent,
  },
  tabText: { color: colors.textFaint, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: colors.accent },
  content: { flex: 1 },
  contentSliding: { flex: 1, flexDirection: "row" },
  contentInner: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  autocompleteContainer: {
    flex: 1,
    position: "relative",
  },
  addInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  suggestionsDropdown: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  suggestionsList: {
    maxHeight: 180,
    flexGrow: 0,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 14,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  itemText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dangerLight,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  removeBtnText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
});
