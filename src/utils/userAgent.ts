let storedUserAgent = "";

export function setUserAgent(ua: string) {
    storedUserAgent = ua;
}

export function getUserAgent(): string {
    return storedUserAgent;
}
