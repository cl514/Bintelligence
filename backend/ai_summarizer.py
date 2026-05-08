from openai import OpenAI


async def summarize_changes(
    competitor_name: str,
    website_changes: list[dict],
    news_articles: list[dict],
    api_key: str,
) -> str:
    if not api_key:
        return "No OpenAI API key configured. Add one in Settings to enable AI summaries."

    changes_text = ""
    if website_changes:
        changes_text = "Website changes detected:\n"
        for change in website_changes[:5]:
            changes_text += f"- Page: {change.get('url', 'unknown')}\n"
            changes_text += f"  Added ~{change.get('added_word_count', 0)} new words\n"
            if change.get("sample_added"):
                sample = ", ".join(list(change["sample_added"])[:10])
                changes_text += f"  New terms: {sample}\n"

    news_text = ""
    if news_articles:
        news_text = "Recent news/press releases:\n"
        for article in news_articles[:8]:
            news_text += f"- {article.get('title', '')}\n"
            if article.get("snippet"):
                news_text += f"  {article['snippet'][:200]}\n"

    if not changes_text and not news_text:
        return "No significant changes or news found in this scan."

    prompt = f"""You are a competitive intelligence analyst for an accounting firm.

Analyze this intelligence report for {competitor_name} and provide a concise, business-focused summary.

{changes_text}
{news_text}

Write a 3-5 sentence summary covering:
1. What changed or was announced
2. Why it matters competitively
3. Any recommended actions or watch items

Be direct and business-focused. Use plain language."""

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"AI summary failed: {str(e)}"


async def generate_daily_digest(competitor_summaries: list[dict], api_key: str) -> str:
    if not api_key:
        return "No OpenAI API key configured."

    summaries_text = ""
    for item in competitor_summaries:
        summaries_text += f"\n## {item['name']}\n{item['summary']}\n"

    prompt = f"""You are a competitive intelligence analyst for an accounting firm.

Create a daily digest from these competitor intelligence summaries:

{summaries_text}

Write a concise executive digest (max 200 words) that:
1. Highlights the most important competitive developments
2. Groups related themes across competitors
3. Lists top 2-3 action items

Format for Slack: use *bold* for key points, no markdown headers."""

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Digest generation failed: {str(e)}"
