import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import Toast from "react-native-toast-message";
import { getToastConfig } from "../utils/toast";
import { useAuthStore } from "../stores/authStore";
import { useChatStore } from "../stores/chatStore";
import { colors } from "../utils/colors";
import type { RootStackParamList } from "./types";
import AuthStack from "./AuthStack";
import MainTabs from "./MainTabs";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const loadChatLayout = useChatStore((s) => s.loadChatLayout);
  const loadAutoFormatSettings = useChatStore((s) => s.loadAutoFormatSettings);
  const loadChatCentered = useChatStore((s) => s.loadChatCentered);

  useEffect(() => {
    initialize();
    loadChatLayout();
    loadAutoFormatSettings();
    loadChatCentered();
  }, [initialize, loadChatLayout, loadAutoFormatSettings, loadChatCentered]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="MainTabs" component={MainTabs} />
          ) : (
            <Stack.Screen name="AuthStack" component={AuthStack} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <Toast config={getToastConfig()} />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
