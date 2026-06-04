import type { MarkdownStyle } from "react-native-enriched-markdown";
import { colors } from "./colors";

export const markdownStyle: MarkdownStyle = {
    paragraph: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    h1: {
        fontSize: 22,
        fontWeight: "800",
        color: colors.text,
        marginTop: 12,
        marginBottom: 8,
    },
    h2: {
        fontSize: 19,
        fontWeight: "700",
        color: colors.text,
        marginTop: 10,
        marginBottom: 6,
    },
    h3: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.textSecondary,
        marginTop: 8,
        marginBottom: 4,
    },
    strong: {
        fontWeight: "bold",
        color: colors.text,
    },
    em: {
        color: colors.textPlaceholder,
    },
    strikethrough: {
        color: colors.textDimAlt,
    },
    link: {
        color: colors.accentLight,
        underline: true,
    },
    code: {
        fontFamily: "monospace",
        fontSize: 13,
        color: colors.accentLight,
        backgroundColor: colors.accentFaded,
        borderColor: "rgba(124,92,231,0.3)",
    },
    codeBlock: {
        fontSize: 13,
        fontFamily: "monospace",
        color: colors.textSecondary,
        backgroundColor: colors.card,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    blockquote: {
        borderColor: colors.accent,
        borderWidth: 2,
        backgroundColor: colors.accentFadedLight,
        marginBottom: 12,
        gapWidth: 10,
    },
    list: {
        fontSize: 15,
        color: colors.textSecondary,
        bulletColor: colors.accent,
        markerColor: colors.textSecondary,
        marginLeft: 20,
        gapWidth: 8,
    },
    thematicBreak: {
        color: colors.border,
        height: 1,
        marginTop: 16,
        marginBottom: 16,
    },
    image: {
        borderRadius: 8,
        marginBottom: 12,
    },
};
