import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

export type ChatsStackParamList = {
    ChatList: undefined;
    ChatScreen: { chatId: number; characterName: string; characterId: string };
    ChatCharacter: { characterId: string; characterName: string };
    GenerationSettings: undefined;
    CreatorScreen: { userId: string; userName: string };
};

export type CharactersStackParamList = {
    CharacterSearch: undefined;
    CharacterScreen: { characterId: string; characterName: string };
    CreatorScreen: { userId: string; userName: string };
};

export type ProfileStackParamList = {
    ProfileHome: undefined;
    Settings: undefined;
    BlockedContent: undefined;
    MyPersonas: undefined;
    MyCharacters: undefined;
    ProfileCharacterScreen: { characterId: string; characterName: string };
    ProfileCreatorScreen: { userId: string; userName: string };
};

export type CreateStackParamList = {
    CreateBot: { characterId?: string; characterName?: string } | undefined;
    CreateCharacterScreen: { characterId: string; characterName: string };
};

export type MainTabParamList = {
    ChatsTab: NavigatorScreenParams<ChatsStackParamList>;
    DiscoverTab: NavigatorScreenParams<CharactersStackParamList>;
    CreateTab: NavigatorScreenParams<CreateStackParamList>;
    ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
    MainTabs: NavigatorScreenParams<MainTabParamList>;
    AuthStack: undefined;
};
