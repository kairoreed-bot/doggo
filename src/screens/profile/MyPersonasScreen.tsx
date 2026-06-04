import { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextInput as RNTextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Avatar from "../../components/common/Avatar";
import Button from "../../components/common/Button";
import CustomAlert from "../../components/common/CustomAlert";
import { useAuthStore } from "../../stores/authStore";
import {
  getMyProfile,
  getMyPersonas,
  updateMainPersona,
  createPersona,
  updatePersona,
  deletePersona,
  reorderPersonas,
  getPersonaGroups,
  createPersonaGroup,
  updatePersonaGroup,
  deletePersonaGroup,
  reorderPersonaGroups,
  uploadFile,
} from "../../api/profile";
import type {
  UserProfile,
  Persona,
  Pronouns,
  PersonaGroup,
  CreatePersonaRequest,
  UpdatePersonaRequest,
} from "../../types/api";
import type { ProfileStackParamList } from "../../navigation/types";
import ScreenHeader from "../../components/common/ScreenHeader";
import { colors } from "../../utils/colors";
import { avatarUrl } from "../../utils/assets";
import { scheduleOnRN } from "react-native-worklets";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "MyPersonas">;

const EMPTY_PRONOUNS: Pronouns = {
  subjective: "",
  objective: "",
  possessive: "",
  possessivePronoun: "",
  reflexive: "",
};

const PRONOUN_PRESETS: Record<string, Pronouns> = {
  "he/him": {
    subjective: "he",
    objective: "him",
    possessive: "his",
    possessivePronoun: "his",
    reflexive: "himself",
  },
  "she/her": {
    subjective: "she",
    objective: "her",
    possessive: "her",
    possessivePronoun: "hers",
    reflexive: "herself",
  },
  "they/them": {
    subjective: "they",
    objective: "them",
    possessive: "their",
    possessivePronoun: "theirs",
    reflexive: "themselves",
  },
};

const GROUP_COLORS = [
  "#7c5ce7",
  "#e74c3c",
  "#2ecc71",
  "#f39c12",
  "#3498db",
  "#e91e63",
  "#00bcd4",
  "#ff9800",
];

function pronounExample(p: Pronouns): string {
  if (!p.subjective) return "";
  return `${p.subjective} blamed ${p.reflexive} for losing ${p.objective}. ${p.possessive} mistake cost a point, but ${p.possessivePronoun} cost the game.`;
}

function matchPronounPreset(p: Pronouns): string {
  for (const [key, pr] of Object.entries(PRONOUN_PRESETS)) {
    if (
      pr.subjective === p.subjective &&
      pr.objective === p.objective &&
      pr.possessive === p.possessive &&
      pr.possessivePronoun === p.possessivePronoun &&
      pr.reflexive === p.reflexive
    ) {
      return key;
    }
  }
  return "Custom";
}

export default function MyPersonasScreen() {
  const { goBack } = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaGroups, setPersonaGroups] = useState<PersonaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"personas" | "groups">("personas");
  const tabIndicator = useSharedValue(0);
  const tabRowWidth = useSharedValue(1);
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);
  const screenWidth = Dimensions.get("window").width;

  const snapToTab = useCallback(
    (t: "personas" | "groups") => {
      setTab(t);
      const target = t === "personas" ? 0 : -tabRowWidth.value;
      translateX.value = withTiming(target, { duration: 250 });
      tabIndicator.value = withTiming(
        t === "personas" ? 0 : tabRowWidth.value / 2,
        { duration: 250 },
      );
    },
    [translateX, tabIndicator, tabRowWidth],
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
          const raw = startX.value + event.translationX;
          const clamped = Math.max(-tabRowWidth.value, Math.min(0, raw));
          translateX.value = clamped;
          const ratio = -clamped / tabRowWidth.value;
          tabIndicator.value = ratio * (tabRowWidth.value / 2);
        })
        .onEnd((event) => {
          const threshold = tabRowWidth.value * 0.3;
          const velocity = event.velocityX ?? 0;
          if (velocity > 300) {
            scheduleOnRN(snapToTab, "personas");
          } else if (velocity < -300) {
            scheduleOnRN(snapToTab, "groups");
          } else {
            const dist = Math.abs(translateX.value);
            if (dist > threshold) {
              scheduleOnRN(snapToTab, "groups");
            } else {
              scheduleOnRN(snapToTab, "personas");
            }
          }
        }),
    [translateX, startX, tabIndicator, tabRowWidth, snapToTab],
  );

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [isMainPersona, setIsMainPersona] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    appearance: "",
    avatar: "",
    groupId: "",
    pronounPreset: "None" as string,
    pronouns: { ...EMPTY_PRONOUNS } as Pronouns,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    color: GROUP_COLORS[0],
  });
  const [groupSaving, setGroupSaving] = useState(false);
  const [deleteGroupAlert, setDeleteGroupAlert] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const [pronounPresetKey, setPronounPresetKey] = useState("None");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  const [drag, setDrag] = useState<
    | {
        type: "persona";
        index: number;
        item: Persona;
        startY: number;
      }
    | {
        type: "group";
        index: number;
        item: PersonaGroup;
        startY: number;
      }
    | null
  >(null);
  const dragDy = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const dragTargetIdx = useSharedValue(-1);
  const personaCardRefs = useRef<Array<View | null>>([]);
  const groupCardRefs = useRef<Array<View | null>>([]);

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const load = async () => {
        try {
          const [p, ps, gs] = await Promise.all([
            getMyProfile(),
            getMyPersonas(),
            getPersonaGroups().catch(() => [] as PersonaGroup[]),
          ]);
          if (!cancelled) {
            setProfile(p);
            setPersonas(ps);
            setPersonaGroups(gs);
          }
        } catch {
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const openEditMain = useCallback(() => {
    if (!profile) return;
    setIsMainPersona(true);
    setEditingId(null);
    setForm({
      name: profile.name || "",
      appearance: profile.profile || "",
      avatar: profile.avatar || "",
      groupId: "",
      pronounPreset: "None",
      pronouns: { ...EMPTY_PRONOUNS },
    });
    setPronounPresetKey("None");
    setGroupDropdownOpen(false);
    setEditModalVisible(true);
  }, [profile]);

  const openEditPersona = useCallback((p: Persona) => {
    setIsMainPersona(false);
    setEditingId(p.id);
    const hasPronouns = !!p.pronouns?.subjective;
    const pronouns = p.pronouns ? { ...p.pronouns } : { ...EMPTY_PRONOUNS };
    const preset = hasPronouns ? matchPronounPreset(pronouns) : "None";
    setForm({
      name: p.name || "",
      appearance: p.appearance || "",
      avatar: p.avatar || "",
      groupId: p.group_id || "",
      pronounPreset: preset,
      pronouns,
    });
    setPronounPresetKey(preset);
    setGroupDropdownOpen(false);
    setEditModalVisible(true);
  }, []);

  const openCreatePersona = useCallback(() => {
    setIsMainPersona(false);
    setEditingId(null);
    setForm({
      name: "",
      appearance: "",
      avatar: "",
      groupId: "",
      pronounPreset: "None",
      pronouns: { ...EMPTY_PRONOUNS },
    });
    setPronounPresetKey("None");
    setGroupDropdownOpen(false);
    setEditModalVisible(true);
  }, []);

  const handlePickAndUploadAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow access to photos to change your avatar.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 256, height: 256 } }],
        { format: ImageManipulator.SaveFormat.WEBP, compress: 0.85 },
      );

      const upload = await uploadFile("webp", "avatar");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload.url);
        xhr.setRequestHeader("Content-Type", "image/webp");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send({
          uri: manipResult.uri,
          type: "image/webp",
          name: "avatar.webp",
        } as any);
      });
      setForm((f) => ({ ...f, avatar: upload.filename }));
    } catch {
      Alert.alert("Error", "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }
    setSaving(true);
    try {
      const pronouns = form.pronouns.subjective ? form.pronouns : null;

      if (isMainPersona) {
        await updateMainPersona({
          name: form.name.trim(),
          avatar: form.avatar.trim(),
          profile: form.appearance.trim(),
        });
      } else if (editingId) {
        const body: Omit<Partial<UpdatePersonaRequest>, "id"> = {
          name: form.name.trim(),
          appearance: form.appearance.trim(),
          avatar: form.avatar.trim(),
        };
        if (form.groupId) body.group_id = form.groupId;
        if (pronouns) body.pronouns = pronouns;
        await updatePersona(editingId, body);
      } else {
        const body: Partial<CreatePersonaRequest> = {
          name: form.name.trim(),
          appearance: form.appearance.trim(),
          avatar: form.avatar.trim(),
        };
        if (form.groupId) body.group_id = form.groupId;
        if (pronouns) body.pronouns = pronouns;
        await createPersona(body);
      }
      setEditModalVisible(false);
      const [p, ps] = await Promise.all([getMyProfile(), getMyPersonas()]);
      setProfile(p);
      setPersonas(ps);
    } catch {
      Alert.alert("Error", "Failed to save persona");
    } finally {
      setSaving(false);
    }
  }, [form, isMainPersona, editingId]);

  const confirmDelete = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteAlertVisible(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deletePersona(deletingId);
      setPersonas((prev) => prev.filter((p) => p.id !== deletingId));
    } catch {
      Alert.alert("Error", "Failed to delete persona");
    } finally {
      setDeleteAlertVisible(false);
      setDeletingId(null);
    }
  }, [deletingId]);

  const handleDragStartPersona = useCallback(
    (index: number, p: Persona) => {
      const ref = personaCardRefs.current[index];
      if (ref) {
        ref.measureInWindow((_x, y) => {
          dragStartY.value = y;
          dragDy.value = 0;
          dragTargetIdx.value = index;
          setDrag({ type: "persona", index, item: p, startY: y });
        });
      }
    },
    [dragDy, dragStartY, dragTargetIdx],
  );

  const handleDragEndPersona = useCallback(
    async (fromIdx: number) => {
      const toIdx = dragTargetIdx.value;
      setDrag(null);
      dragDy.value = 0;
      dragStartY.value = 0;
      dragTargetIdx.value = -1;
      if (toIdx < 0 || toIdx >= personas.length || toIdx === fromIdx) return;
      const updated = [...personas];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      setPersonas(updated);
      try {
        await reorderPersonas(
          updated.map((p, i) => ({ id: p.id, order: i + 1 })),
        );
      } catch {
        const ps = await getMyPersonas();
        setPersonas(ps);
      }
    },
    [personas, dragTargetIdx, dragDy, dragStartY],
  );

  const handleDragStartGroup = useCallback(
    (index: number, g: PersonaGroup) => {
      const ref = groupCardRefs.current[index];
      if (ref) {
        ref.measureInWindow((_x, y) => {
          dragStartY.value = y;
          dragDy.value = 0;
          dragTargetIdx.value = index;
          setDrag({ type: "group", index, item: g, startY: y });
        });
      }
    },
    [dragDy, dragStartY, dragTargetIdx],
  );

  const handleDragEndGroup = useCallback(
    async (fromIdx: number) => {
      const toIdx = dragTargetIdx.value;
      setDrag(null);
      dragDy.value = 0;
      dragStartY.value = 0;
      dragTargetIdx.value = -1;
      if (toIdx < 0 || toIdx >= personaGroups.length || toIdx === fromIdx)
        return;
      const updated = [...personaGroups];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      setPersonaGroups(updated);
      try {
        await reorderPersonaGroups(
          updated.map((g, i) => ({ id: g.id, order: i + 1 })),
        );
      } catch {
        const gs = await getPersonaGroups();
        setPersonaGroups(gs);
      }
    },
    [personaGroups, dragTargetIdx, dragDy, dragStartY],
  );

  const openCreateGroup = useCallback(() => {
    setEditingGroupId(null);
    setGroupForm({ name: "", description: "", color: GROUP_COLORS[0] });
    setGroupModalVisible(true);
  }, []);

  const openEditGroup = useCallback((g: PersonaGroup) => {
    setEditingGroupId(g.id);
    setGroupForm({
      name: g.name,
      description: g.description,
      color: g.color,
    });
    setGroupModalVisible(true);
  }, []);

  const handleSaveGroup = useCallback(async () => {
    if (!groupForm.name.trim()) return;
    setGroupSaving(true);
    try {
      const data = {
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        color: groupForm.color,
      };
      if (editingGroupId) {
        await updatePersonaGroup(editingGroupId, data);
      } else {
        await createPersonaGroup(data);
      }
      setGroupModalVisible(false);
      setEditingGroupId(null);
      const gs = await getPersonaGroups();
      setPersonaGroups(gs);
    } catch {
      Alert.alert("Error", "Failed to save group");
    } finally {
      setGroupSaving(false);
    }
  }, [groupForm, editingGroupId]);

  const confirmDeleteGroup = useCallback((id: string) => {
    setDeletingGroupId(id);
    setDeleteGroupAlert(true);
  }, []);

  const handleDeleteGroup = useCallback(async () => {
    if (!deletingGroupId) return;
    try {
      await deletePersonaGroup(deletingGroupId);
      setPersonaGroups((prev) => prev.filter((g) => g.id !== deletingGroupId));
    } catch {
      Alert.alert("Error", "Failed to delete group");
    } finally {
      setDeleteGroupAlert(false);
      setDeletingGroupId(null);
    }
  }, [deletingGroupId]);

  const getGroupById = useCallback(
    (groupId: string | null) => {
      if (!groupId) return null;
      return personaGroups.find((g) => g.id === groupId) || null;
    },
    [personaGroups],
  );

  const getPersonasInGroup = useCallback(
    (groupId: string) => personas.filter((p) => p.group_id === groupId),
    [personas],
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicator.value }],
  }));

  const contentTranslateStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          (translateX.value / Math.max(tabRowWidth.value, 1)) * screenWidth,
      },
    ],
  }));

  const dragOverlayStyle = useAnimatedStyle(() => ({
    position: "absolute" as const,
    transform: [{ translateY: dragStartY.value + dragDy.value }],
    zIndex: 9999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  }));

  const handleTabRowLayout = useCallback(
    (width: number) => {
      tabRowWidth.value = width;
      tabIndicator.value = tab === "personas" ? 0 : width / 2;
      translateX.value = tab === "personas" ? 0 : -width;
    },
    [tab, tabIndicator, translateX, tabRowWidth],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{"\u2190"}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>My Personas</Text>
          <View style={styles.backBtn} />
        </View>
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </View>
    );
  }

  const mainAvatar = profile?.avatar ? avatarUrl(profile.avatar) : undefined;
  const mainName =
    profile?.name || user?.user_metadata?.email || user?.email || "User";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{"\u2190"}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Personas</Text>
        <View style={styles.backBtn} />
      </View>

      <View
        style={styles.tabRow}
        onLayout={(e) => handleTabRowLayout(e.nativeEvent.layout.width)}
      >
        <Pressable onPress={() => snapToTab("personas")} style={styles.tab}>
          <Text
            style={[styles.tabText, tab === "personas" && styles.tabTextActive]}
          >
            Personas
          </Text>
        </Pressable>
        <Pressable onPress={() => snapToTab("groups")} style={styles.tab}>
          <Text
            style={[styles.tabText, tab === "groups" && styles.tabTextActive]}
          >
            Persona Groups
          </Text>
        </Pressable>
        <Animated.View style={[styles.tabIndicator, indicatorStyle]} />
      </View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.contentSliding,
              { width: screenWidth * 2 },
              contentTranslateStyle,
            ]}
          >
            <ScrollView
              style={{ width: screenWidth }}
              contentContainerStyle={styles.contentInner}
              scrollEnabled={!drag}
            >
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Main Persona</Text>
                <View style={styles.mainPersonaCard}>
                  <Avatar uri={mainAvatar} name={mainName} size={56} />
                  <View style={styles.mainPersonaInfo}>
                    <Text style={styles.mainPersonaName}>{mainName}</Text>
                    <Text
                      style={styles.mainPersonaAppearance}
                      numberOfLines={2}
                    >
                      {profile?.profile || "No appearance set"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={openEditMain}
                    style={({ pressed }) => [
                      styles.editBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.editBtnText}>Edit</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personas</Text>
                {personas.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No personas yet</Text>
                    <Text style={styles.emptySubtext}>
                      Create additional personas to use in chats
                    </Text>
                  </View>
                ) : (
                  personas.map((p, i) => {
                    const group = getGroupById(p.group_id);
                    return (
                      <GestureDetector
                        key={p.id}
                        gesture={Gesture.Exclusive(
                          Gesture.Pan()
                            .activateAfterLongPress(400)
                            .onStart(() => {
                              scheduleOnRN(handleDragStartPersona, i, p);
                            })
                            .onUpdate((e) => {
                              dragDy.value = e.translationY;
                              const cardH = 88;
                              dragTargetIdx.value = Math.max(
                                0,
                                Math.min(
                                  personas.length - 1,
                                  Math.round(i + e.translationY / cardH),
                                ),
                              );
                            })
                            .onEnd(() => {
                              scheduleOnRN(handleDragEndPersona, i);
                            }),
                          Gesture.Tap().onEnd(() => {
                            scheduleOnRN(openEditPersona, p);
                          }),
                        )}
                      >
                        <Animated.View
                          ref={(ref: View | null) => {
                            personaCardRefs.current[i] = ref;
                          }}
                          style={[
                            styles.personaCard,
                            drag?.index === i && {
                              opacity: 0.3,
                            },
                          ]}
                        >
                          <Avatar
                            uri={p.avatar ? avatarUrl(p.avatar) : undefined}
                            name={p.name}
                            size={48}
                          />
                          <View style={styles.personaCardInfo}>
                            <Text style={styles.personaCardName}>{p.name}</Text>
                            <Text
                              style={styles.personaCardAppearance}
                              numberOfLines={1}
                            >
                              {p.appearance || "No appearance"}
                            </Text>
                            {group && (
                              <View
                                style={[
                                  styles.groupChip,
                                  {
                                    backgroundColor: `${group.color}33`,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.groupChipText,
                                    {
                                      color: group.color,
                                    },
                                  ]}
                                >
                                  {group.name}
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.dragHandle}>
                            <Text style={styles.dragHandleText}>
                              {"\u2630"}
                            </Text>
                          </View>
                        </Animated.View>
                      </GestureDetector>
                    );
                  })
                )}
                <Button
                  title="Add Persona"
                  onPress={openCreatePersona}
                  style={styles.addBtn}
                />
              </View>
            </ScrollView>

            <ScrollView
              style={{ width: screenWidth }}
              contentContainerStyle={styles.contentInner}
              scrollEnabled={!drag}
            >
              <View style={styles.section}>
                {personaGroups.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No groups</Text>
                    <Text style={styles.emptySubtext}>
                      Create groups to organize your personas
                    </Text>
                  </View>
                ) : (
                  personaGroups.map((g, i) => {
                    const members = getPersonasInGroup(g.id);
                    return (
                      <GestureDetector
                        key={g.id}
                        gesture={Gesture.Exclusive(
                          Gesture.Pan()
                            .activateAfterLongPress(400)
                            .onStart(() => {
                              scheduleOnRN(handleDragStartGroup, i, g);
                            })
                            .onUpdate((e) => {
                              dragDy.value = e.translationY;
                              const rowH = 100;
                              dragTargetIdx.value = Math.max(
                                0,
                                Math.min(
                                  personaGroups.length - 1,
                                  Math.round(i + e.translationY / rowH),
                                ),
                              );
                            })
                            .onEnd(() => {
                              scheduleOnRN(handleDragEndGroup, i);
                            }),
                          Gesture.Tap().onEnd(() => {
                            scheduleOnRN(openEditGroup, g);
                          }),
                        )}
                      >
                        <Animated.View
                          ref={(ref: View | null) => {
                            groupCardRefs.current[i] = ref;
                          }}
                          style={[
                            styles.groupCard,
                            drag?.index === i &&
                              drag?.type === "group" && {
                                opacity: 0.3,
                              },
                          ]}
                        >
                          <View style={styles.groupCardHeader}>
                            <View
                              style={[
                                styles.groupDot,
                                {
                                  backgroundColor: g.color,
                                },
                              ]}
                            />
                            <Text style={styles.groupCardName}>{g.name}</Text>
                            <Text style={styles.groupCardCount}>
                              {members.length} persona
                              {members.length !== 1 ? "s" : ""}
                            </Text>
                            <View style={styles.dragHandle}>
                              <Text style={styles.dragHandleText}>
                                {"\u2630"}
                              </Text>
                            </View>
                          </View>
                          {g.description ? (
                            <Text style={styles.groupDesc}>
                              {g.description}
                            </Text>
                          ) : null}
                          {members.length > 0 && (
                            <View style={styles.groupMembers}>
                              {members.map((p) => (
                                <View key={p.id} style={styles.groupMemberRow}>
                                  <Avatar
                                    uri={
                                      p.avatar ? avatarUrl(p.avatar) : undefined
                                    }
                                    name={p.name}
                                    size={28}
                                  />
                                  <Text style={styles.groupMemberName}>
                                    {p.name}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                          {members.length === 0 && (
                            <Text style={styles.groupEmptyMembers}>
                              No personas in this group
                            </Text>
                          )}
                        </Animated.View>
                      </GestureDetector>
                    );
                  })
                )}
                <Button
                  title="Create Group"
                  onPress={openCreateGroup}
                  style={styles.createGroupBtn}
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </GestureDetector>

      {drag && (
        <Animated.View style={dragOverlayStyle}>
          {drag.type === "persona" ? (
            <View style={[styles.personaCard, styles.dragCard]}>
              <Avatar
                uri={
                  (drag.item as Persona).avatar
                    ? avatarUrl((drag.item as Persona).avatar)
                    : undefined
                }
                name={(drag.item as Persona).name}
                size={48}
              />
              <View style={styles.personaCardInfo}>
                <Text style={styles.personaCardName}>
                  {(drag.item as Persona).name}
                </Text>
                <Text style={styles.personaCardAppearance} numberOfLines={1}>
                  {(drag.item as Persona).appearance || "No appearance"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.groupCard, styles.dragCard]}>
              <View
                style={[
                  styles.groupDot,
                  {
                    backgroundColor: (drag.item as PersonaGroup).color,
                  },
                ]}
              />
              <Text style={styles.groupCardName}>
                {(drag.item as PersonaGroup).name}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -100}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isMainPersona
                ? "Edit Main Persona"
                : editingId
                  ? "Edit Persona"
                  : "Create Persona"}
            </Text>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollInner}
              keyboardShouldPersistTaps="handled"
            >
              <Pressable
                onPress={handlePickAndUploadAvatar}
                style={styles.avatarWrapper}
              >
                {form.avatar ? (
                  <Avatar
                    uri={avatarUrl(form.avatar)}
                    name={form.name}
                    size={80}
                  />
                ) : (
                  <Avatar name={form.name} size={80} />
                )}
                <View style={styles.avatarBadge}>
                  <Text style={styles.avatarBadgeText}>
                    {uploading ? "..." : "Edit"}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name</Text>
                <RNTextInput
                  style={styles.formInput}
                  placeholder="Persona name"
                  placeholderTextColor={colors.textPlaceholder}
                  value={form.name}
                  onChangeText={(v) =>
                    setForm((f) => ({
                      ...f,
                      name: v,
                    }))
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Appearance</Text>
                <RNTextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  placeholder="Describe how this persona looks and acts"
                  placeholderTextColor={colors.textPlaceholder}
                  value={form.appearance}
                  onChangeText={(v) =>
                    setForm((f) => ({
                      ...f,
                      appearance: v,
                    }))
                  }
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {!isMainPersona && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Group</Text>
                  {personaGroups.length === 0 ? (
                    <Text style={styles.dropdownEmpty}>
                      No groups — create one in the Groups tab
                    </Text>
                  ) : (
                    <View>
                      <Pressable
                        onPress={() => setGroupDropdownOpen(!groupDropdownOpen)}
                        style={[
                          styles.dropdown,
                          groupDropdownOpen && styles.dropdownOpen,
                        ]}
                      >
                        <Text style={styles.dropdownText} numberOfLines={1}>
                          {form.groupId
                            ? (personaGroups.find((g) => g.id === form.groupId)
                                ?.name ?? "None")
                            : "None"}
                        </Text>
                        <Text style={styles.dropdownArrow}>
                          {groupDropdownOpen ? "\u25B2" : "\u25BC"}
                        </Text>
                      </Pressable>
                      {groupDropdownOpen && (
                        <View style={styles.dropdownOptions}>
                          <Pressable
                            onPress={() => {
                              setForm((f) => ({ ...f, groupId: "" }));
                              setGroupDropdownOpen(false);
                            }}
                            style={[
                              styles.dropdownOption,
                              form.groupId === "" &&
                                styles.dropdownOptionActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dropdownOptionText,
                                form.groupId === "" &&
                                  styles.dropdownOptionTextActive,
                              ]}
                            >
                              None
                            </Text>
                          </Pressable>
                          {personaGroups.map((g) => (
                            <Pressable
                              key={g.id}
                              onPress={() => {
                                setForm((f) => ({ ...f, groupId: g.id }));
                                setGroupDropdownOpen(false);
                              }}
                              style={[
                                styles.dropdownOption,
                                form.groupId === g.id &&
                                  styles.dropdownOptionActive,
                              ]}
                            >
                              <View
                                style={[
                                  styles.groupDot,
                                  { backgroundColor: g.color },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.dropdownOptionText,
                                  form.groupId === g.id &&
                                    styles.dropdownOptionTextActive,
                                ]}
                              >
                                {g.name}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}

              {!isMainPersona && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Pronouns</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dropdownScroll}
                  >
                    {["None", "he/him", "she/her", "they/them", "Custom"].map(
                      (opt) => (
                        <Pressable
                          key={opt}
                          onPress={() => {
                            setPronounPresetKey(opt);
                            if (opt === "Custom") {
                              setForm(
                                (f) =>
                                  ({
                                    ...f,
                                    pronounPreset: "Custom",
                                  }) as any,
                              );
                            } else if (opt === "None") {
                              setForm(
                                (f) =>
                                  ({
                                    ...f,
                                    pronounPreset: "None",
                                    pronouns: {
                                      ...EMPTY_PRONOUNS,
                                    },
                                  }) as any,
                              );
                            } else {
                              const preset = PRONOUN_PRESETS[opt];
                              setForm(
                                (f) =>
                                  ({
                                    ...f,
                                    pronounPreset: opt,
                                    pronouns: {
                                      ...preset,
                                    },
                                  }) as any,
                              );
                            }
                          }}
                          style={[
                            styles.dropdownItem,
                            pronounPresetKey === opt &&
                              styles.dropdownItemActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              pronounPresetKey === opt &&
                                styles.dropdownItemTextActive,
                            ]}
                          >
                            {opt}
                          </Text>
                        </Pressable>
                      ),
                    )}
                  </ScrollView>

                  {pronounPresetKey !== "None" && (
                    <Text style={styles.pronounExample}>
                      {pronounExample(
                        pronounPresetKey === "Custom"
                          ? form.pronouns
                          : PRONOUN_PRESETS[pronounPresetKey],
                      )}
                    </Text>
                  )}

                  {pronounPresetKey === "Custom" && (
                    <View style={styles.pronounsGrid}>
                      {[
                        {
                          key: "subjective",
                          label: "Subjective",
                        } as const,
                        {
                          key: "objective",
                          label: "Objective",
                        } as const,
                        {
                          key: "possessive",
                          label: "Possessive",
                        } as const,
                        {
                          key: "possessivePronoun",
                          label: "Poss. Pronoun",
                        } as const,
                        {
                          key: "reflexive",
                          label: "Reflexive",
                        } as const,
                      ].map(({ key, label }) => (
                        <View key={key} style={styles.pronounField}>
                          <Text style={styles.pronounLabel}>{label}</Text>
                          <RNTextInput
                            style={styles.pronounInput}
                            placeholder={label}
                            placeholderTextColor={colors.textPlaceholder}
                            value={form.pronouns[key]}
                            onChangeText={(v) =>
                              setForm(
                                (f) =>
                                  ({
                                    ...f,
                                    pronouns: {
                                      ...f.pronouns,
                                      [key]: v,
                                    },
                                  }) as any,
                              )
                            }
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEditModalVisible(false)}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving || uploading}
                style={({ pressed }) => [
                  styles.modalSaveBtn,
                  pressed && { opacity: 0.7 },
                  (saving || uploading) && {
                    opacity: 0.5,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </Pressable>
            </View>
            {!isMainPersona && editingId && (
              <Pressable
                onPress={() => {
                  setEditModalVisible(false);
                  confirmDelete(editingId);
                }}
                style={({ pressed }) => [
                  styles.modalDeleteBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalDeleteText}>Delete Persona</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert
        visible={deleteAlertVisible}
        title="Delete Persona"
        message="Are you sure you want to delete this persona? This action cannot be undone."
        buttons={[
          {
            text: "Delete",
            style: "destructive",
            onPress: handleDelete,
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setDeleteAlertVisible(false),
          },
        ]}
        onDismiss={() => setDeleteAlertVisible(false)}
      />

      <Modal
        visible={groupModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setGroupModalVisible(false);
          setEditingGroupId(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -100}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingGroupId ? "Edit Group" : "Create Group"}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name</Text>
              <RNTextInput
                style={styles.formInput}
                placeholder="Group name"
                placeholderTextColor={colors.textPlaceholder}
                value={groupForm.name}
                onChangeText={(v) =>
                  setGroupForm((f) => ({
                    ...f,
                    name: v,
                  }))
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <RNTextInput
                style={styles.formInput}
                placeholder="Group description"
                placeholderTextColor={colors.textPlaceholder}
                value={groupForm.description}
                onChangeText={(v) =>
                  setGroupForm((f) => ({
                    ...f,
                    description: v,
                  }))
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Color</Text>
              <View style={styles.colorRow}>
                {GROUP_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() =>
                      setGroupForm((f) => ({
                        ...f,
                        color: c,
                      }))
                    }
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      groupForm.color === c && styles.colorSwatchActive,
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setGroupModalVisible(false);
                  setEditingGroupId(null);
                }}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveGroup}
                disabled={groupSaving}
                style={({ pressed }) => [
                  styles.modalSaveBtn,
                  pressed && { opacity: 0.7 },
                  groupSaving && { opacity: 0.5 },
                ]}
              >
                {groupSaving ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingGroupId ? "Save" : "Create"}
                  </Text>
                )}
              </Pressable>
            </View>
            {editingGroupId && (
              <Pressable
                onPress={() => {
                  setGroupModalVisible(false);
                  confirmDeleteGroup(editingGroupId);
                }}
                style={({ pressed }) => [
                  styles.modalDeleteBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.modalDeleteText}>Delete Group</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert
        visible={deleteGroupAlert}
        title="Delete Group"
        message="Are you sure you want to delete this group? Personas in this group will not be deleted."
        buttons={[
          {
            text: "Delete",
            style: "destructive",
            onPress: handleDeleteGroup,
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setDeleteGroupAlert(false),
          },
        ]}
        onDismiss={() => setDeleteGroupAlert(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: { color: colors.accent, fontSize: 24, fontWeight: "600" },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    position: "relative",
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
    width: "50%",
    height: 2,
    backgroundColor: colors.accent,
  },
  tabText: { color: colors.textFaint, fontSize: 14, fontWeight: "600" },
  tabTextActive: { color: colors.accent },
  content: { flex: 1 },
  contentSliding: { flex: 1, flexDirection: "row" },
  contentInner: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  mainPersonaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  mainPersonaInfo: { flex: 1 },
  mainPersonaName: { color: colors.text, fontSize: 16, fontWeight: "700" },
  mainPersonaAppearance: {
    color: colors.textFaint,
    fontSize: 13,
    marginTop: 4,
  },
  editBtn: {
    backgroundColor: colors.accentFaded,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: { color: colors.accent, fontSize: 13, fontWeight: "600" },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: { color: colors.textFaint, fontSize: 14 },
  emptySubtext: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },

  personaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    gap: 10,
  },
  personaCardInfo: { flex: 1 },
  personaCardName: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  personaCardAppearance: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 2,
  },
  groupChip: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 6,
  },
  groupChipText: { fontSize: 11, fontWeight: "600" },
  addBtn: { marginTop: 8 },

  groupCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  groupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  groupCardName: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  groupCardCount: { color: colors.textDim, fontSize: 12 },
  groupDesc: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 8,
  },
  groupMembers: { marginTop: 8, gap: 6 },
  groupMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupMemberName: { color: colors.textDim, fontSize: 13 },
  groupEmptyMembers: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  createGroupBtn: { marginTop: 8 },

  dragHandle: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  dragHandleText: {
    color: colors.textDim,
    fontSize: 14,
  },

  dragCard: {
    transform: [{ scale: 1.03 }],
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  modalScroll: { maxHeight: "100%" },
  modalScrollInner: { paddingBottom: 16 },

  avatarWrapper: { alignSelf: "center", marginBottom: 16 },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: -4,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  avatarBadgeText: { color: colors.text, fontSize: 10, fontWeight: "700" },

  formGroup: { marginBottom: 16 },
  formLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  formInputMultiline: { minHeight: 100, paddingTop: 12 },

  groupList: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  groupListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupListItemActive: {
    backgroundColor: colors.accentFaded,
  },
  groupListItemText: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: "500",
  },
  groupListItemTextActive: {
    color: colors.accent,
    fontWeight: "600",
  },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: colors.accent,
  },
  dropdownText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 15,
  },
  dropdownArrow: {
    color: colors.textFaint,
    fontSize: 12,
    marginLeft: 8,
  },
  dropdownOptions: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.accent,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: "hidden",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dropdownOptionActive: {
    backgroundColor: colors.accentFaded,
  },
  dropdownOptionText: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownOptionTextActive: {
    color: colors.accent,
    fontWeight: "600",
  },

  dropdownScroll: { gap: 8 },
  dropdownEmpty: { color: colors.textDim, fontSize: 13 },
  dropdownItem: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownItemActive: {
    backgroundColor: colors.accentFaded,
    borderColor: colors.accent,
  },
  dropdownItemText: {
    color: colors.textFaint,
    fontSize: 13,
    fontWeight: "500",
  },
  dropdownItemTextActive: { color: colors.accent, fontWeight: "600" },

  pronounExample: {
    color: colors.textDim,
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 18,
  },
  pronounsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pronounField: { width: "48%", flexGrow: 1 },
  pronounLabel: { color: colors.textDim, fontSize: 11, marginBottom: 4 },
  pronounInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalSaveText: { color: colors.text, fontSize: 15, fontWeight: "600" },

  colorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: colors.text,
  },

  modalDeleteBtn: {
    marginTop: 8,
    paddingVertical: 10,
    alignItems: "center" as const,
  },
  modalDeleteText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
});
