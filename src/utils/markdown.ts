export function htmlToMarkdown(text?: string): string {
    return text
        ? text
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
              .replace(/<b>(.*?)<\/b>/gi, "**$1**")
              .replace(/<em>(.*?)<\/em>/gi, "*$1*")
              .replace(/<i>(.*?)<\/i>/gi, "*$1*")
              .replace(/<u>(.*?)<\/u>/gi, "__$1__")
              .replace(/<br\s*\/?>/gi, "\n\n")
              .replace(/<p[^>]*>/gi, "")
              .replace(/<\/p>/gi, "\n\n")
              .replace(/<[^>]*>/g, "")
        : "";
}

export function stripHtml(text?: string): string {
    return text
        ? text
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<[^>]*>/g, "")
        : "";
}

export function replaceTags(
    text: string | null | undefined,
    personaName?: string,
    characterChatName?: string,
): string {
    return (text ?? "")
        .replace(/{{user}}/gi, personaName ?? "user")
        .replace(/anon/gi, personaName ?? "user")
        .replace(/{{char}}/gi, characterChatName ?? "Character");
}

const anonRegex = /(?<!\\w)Anon(?=(?:[^\\w']|$)|'s)/g
export const escapeRegex = (thing: string) => thing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const generify = (thing: string, charName: string) =>
    thing?.replaceAll(anonRegex, "{{user}}").replaceAll(new RegExp(`(?<!\\w)${escapeRegex(charName)}(?=(?:[^\\w']|$)|'s)`, 'g'), "{{char}}");
export const cleanTags = (thing: string, personaTag: string) =>
    thing
        .replace(
            new RegExp(
                `<${personaTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>`,
                "i",
            ),
            "",
        )
        .replace(
            new RegExp(
                `</${personaTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}>`,
                "i",
            ),
            "",
        )
        .trim();
