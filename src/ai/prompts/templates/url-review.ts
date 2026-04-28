export function buildUrlReviewPrompt(url: string, question?: string): string {
  const base = `以下のURLの内容を読み取り、解説してください：\n${url}`;
  return question ? `${base}\n\n特に以下の点について：${question}` : base;
}
