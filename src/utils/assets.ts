const ELLA_BASE = "https://ella.janitorai.com";

export function botAvatarUrl(filename: string): string {
    return `${ELLA_BASE}/bot-avatars/${filename}`;
}
export function avatarUrl(filename: string): string {
    return `${ELLA_BASE}/avatars/${filename}`;
}

export function assetUrl(path: string): string {
    return `${ELLA_BASE}/${path}`;
}
