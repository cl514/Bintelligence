import asyncio
import json
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from openai import OpenAI

from config_manager import COMPLIANCE_DEFAULTS, load_compliance_settings
from scraper import extract_text
from compliance_manager import normalize_address, normalize_email, normalize_phone

PHONE_PATTERN = re.compile(r"(\+\d[\d\s\-()]{6,}\d)")
EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
ADDRESS_PATTERN = re.compile(r"\b(straße|str\.|platz|allee|weg|gasse|ring|straße)\b", re.IGNORECASE)


def _clean_text(text: str) -> str:
    return text.lower().strip()


def _build_llm_prompt(text: str, url: str) -> str:
    settings = load_compliance_settings()
    template = settings.get("llm_system_prompt") or COMPLIANCE_DEFAULTS["llm_system_prompt"]
    rendered = template
    try:
        rendered = template.format(url=url, site_text=text[:2800], text=text[:2800])
    except Exception:
        rendered = template
    if "{url}" in template or "{site_text}" in template or "{text}" in template:
        return rendered
    return (
        f"{rendered}\n"
        f"URL: {url}\n"
        f"Seiteninhalt: {text[:2800]}\n"
    )


def _parse_llm_response(content: str) -> Dict[str, Any]:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {
            "rating": "GELB",
            "findings": ["LLM-Antwort konnte nicht als JSON geparst werden."],
            "suggestions": ["Überprüfe die regulatorische Formulierung manuell."],
        }


async def _call_llm(prompt: str, api_key: str) -> Dict[str, Any]:
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=350,
        messages=[{"role": "user", "content": prompt}],
    )
    return _parse_llm_response(response.choices[0].message.content)


async def run_llm_checker(text: str, url: str, api_key: str) -> Dict[str, Any]:
    if not api_key:
        return {
            "rating": "GELB",
            "findings": ["OpenAI API key fehlt."],
            "suggestions": ["OpenAI API key in den Einstellungen konfigurieren."],
        }

    prompt = _build_llm_prompt(text, url)
    try:
        return await asyncio.to_thread(_call_llm, prompt, api_key)
    except Exception as exc:
        return {
            "rating": "GELB",
            "findings": [f"LLM-Analyse fehlgeschlagen: {exc}"],
            "suggestions": ["Erneut versuchen oder Konfiguration prüfen."],
        }


def _find_phone_numbers(text: str) -> List[str]:
    return [normalize_phone(match.strip()) for match in PHONE_PATTERN.findall(text)]


def _find_emails(text: str) -> List[str]:
    return [normalize_email(match.strip()) for match in EMAIL_PATTERN.findall(text)]


def _find_addresses(text: str) -> List[str]:
    addresses = []
    for match in ADDRESS_PATTERN.findall(text):
        addresses.append(match.strip())
    return addresses


def run_whitelist_checker(text: str, brand_config: Dict[str, Any]) -> Dict[str, Any]:
    normalized_text = _clean_text(text)
    known_phones = {normalize_phone(p) for p in brand_config.get("whitelist", {}).get("phones", [])}
    known_emails = {normalize_email(e) for e in brand_config.get("whitelist", {}).get("emails", [])}
    known_addresses = {normalize_address(a) for a in brand_config.get("whitelist", {}).get("addresses", [])}

    found_phones = [p for p in _find_phone_numbers(text) if p]
    found_emails = [e for e in _find_emails(text) if e]
    found_addresses = [normalize_address(a) for a in brand_config.get("whitelist", {}).get("addresses", []) if normalize_address(a) in normalized_text]

    unknown_phones = [p for p in found_phones if p not in known_phones]
    unknown_emails = [e for e in found_emails if e not in known_emails]
    unknown_addresses = []
    if known_addresses:
        for address in known_addresses:
            if address in normalized_text:
                continue
        if ADDRESS_PATTERN.search(text):
            unknown_addresses = ["Mögliche Adresse ohne Whitelist-Treffer"]

    rating = "GRÜN" if not (unknown_phones or unknown_emails or unknown_addresses) else "ROT"
    findings: List[str] = []
    if unknown_phones:
        findings.append(f"Unbekannte Telefonnummern: {unknown_phones}")
    if unknown_emails:
        findings.append(f"Unbekannte E-Mails: {unknown_emails}")
    if unknown_addresses:
        findings.append("Unbekannte oder neue Adresse auf der Seite entdeckt.")
    if not findings:
        findings.append("Alle gefundene Kontaktinformationen sind in der Whitelist enthalten.")

    return {
        "rating": rating,
        "matched_values": {
            "phones": [p for p in found_phones if p in known_phones],
            "emails": [e for e in found_emails if e in known_emails],
            "addresses": found_addresses,
        },
        "unknown_values": {
            "phones": unknown_phones,
            "emails": unknown_emails,
            "addresses": unknown_addresses,
        },
        "findings": findings,
        "suggestions": [
            "Whitelist fehlende Kontaktdaten oder entferne nicht zugelassene Werte.",
        ],
    }


def _find_footer_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    footer = soup.find("footer")
    if footer:
        return footer.get_text(separator=" ", strip=True)
    return ""


def run_required_field_checker(html: str, text: str, brand_config: Dict[str, Any]) -> Dict[str, Any]:
    checks = []
    findings: List[str] = []
    for required in brand_config.get("required_texts", []):
        snippet = required.get("text", "")
        location = required.get("location", "body").lower()
        fuzzy = required.get("fuzzy_match", False)

        if location == "footer":
            candidate = _find_footer_text(html)
        else:
            candidate = text

        candidate_lower = candidate.lower()
        snippet_lower = snippet.lower()
        found = snippet_lower in candidate_lower
        if not found and fuzzy:
            found = all(word in candidate_lower for word in snippet_lower.split() if len(word) > 3)

        rating = "GRÜN" if found else "ROT"
        checks.append({
            "text": snippet,
            "location": location,
            "fuzzy_match": fuzzy,
            "rating": rating,
        })
        if not found:
            findings.append(f"Pflichtfeld fehlt ({location}): {snippet}")

    overall = "GRÜN"
    if any(c["rating"] == "ROT" for c in checks):
        overall = "ROT"
    return {
        "rating": overall,
        "checks": checks,
        "findings": findings or ["Alle Pflichtfelder sind vorhanden."],
        "suggestions": ["Fehlende Pflichtfelder ergänzen."],
    }


def compute_overall_rating(checkers: List[Dict[str, Any]]) -> str:
    if any(checker.get("rating") == "ROT" for checker in checkers):
        return "ROT"
    if any(checker.get("rating") == "GELB" for checker in checkers):
        return "GELB"
    return "GRÜN"


async def run_compliance_checks_for_page(
    url: str,
    html: str,
    brand_config: Dict[str, Any],
    api_key: str,
) -> Dict[str, Any]:
    text = extract_text(html)
    llm_result = await run_llm_checker(text, url, api_key)
    whitelist_result = run_whitelist_checker(text, brand_config)
    required_result = run_required_field_checker(html, text, brand_config)

    overall = compute_overall_rating([llm_result, whitelist_result, required_result])

    return {
        "url": url,
        "rating": overall,
        "page_title": None,
        "llm_checker": llm_result,
        "whitelist_checker": whitelist_result,
        "required_field_checker": required_result,
        "text_snippet": text[:800],
    }
