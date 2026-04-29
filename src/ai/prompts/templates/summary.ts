export interface FetchedContent {
  url: string;
  text: string;
}

export function buildSummaryPrompt(contents: FetchedContent[]): string {
  const contentSections = contents
    .map((c) => `### ${c.url}\n${c.text}`)
    .join("\n\n");
  return [
    // biome-ignore lint/security/noSecrets: static Japanese prompt text, not a secret
    "以下のWebページの内容を要約してください。",
    "",
    contentSections,
    "",
    "## 要件",
    // biome-ignore lint/security/noSecrets: static Japanese prompt text, not a secret
    "- 日本語で要約してください",
    // biome-ignore lint/security/noSecrets: static Japanese prompt text, not a secret
    "- 重要なポイントを箇条書きで含めてください",
    // biome-ignore lint/security/noSecrets: static Japanese prompt text, not a secret
    "- 各URLごとに要約を分けて記載してください",
  ].join("\n");
}
