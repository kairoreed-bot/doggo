import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardHeight(): number {
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const eventShow =
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const eventHide =
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
        const show = Keyboard.addListener(eventShow as any, (e: any) =>
            setKeyboardHeight(e.endCoordinates.height),
        );
        const hide = Keyboard.addListener(eventHide as any, () =>
            setKeyboardHeight(0),
        );
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    return keyboardHeight;
}
