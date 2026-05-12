import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from config_manager import load_config

PHONE_CLEAN_RE = re.compile(r"[^\d+]")
ADDRESS_NORMALIZE_RE = re.compile(r"[\s\-.,] +")


def get_compliance_brands() -> List[Dict[str, Any]]:
    return load_config().get("compliance_brands", [])


def get_compliance_brand(brand_id: str) -> Optional[Dict[str, Any]]:
    for brand in get_compliance_brands():
        if brand.get("id") == brand_id:
            return brand
    return None


def normalize_phone(value: str) -> str:
    return PHONE_CLEAN_RE.sub("", value or "")


def normalize_email(value: str) -> str:
    return (value or "").strip().lower()


def normalize_address(value: str) -> str:
    normalized = re.sub(r"[\s\-.,]+", " ", (value or "").strip()).lower()
    return normalized


def _hostname_from_url(url: str) -> str:
    try:
        return urlparse(url).hostname or ""
    except Exception:
        return ""


def _matches_domain(hostname: str, domain: str) -> bool:
    hostname = hostname.lower().lstrip(".")
    domain = domain.lower().lstrip(".")
    return hostname == domain or hostname.endswith(f".{domain}")


def find_brand_for_url(url: str) -> Optional[Dict[str, Any]]:
    hostname = _hostname_from_url(url)
    if not hostname:
        return None

    for brand in get_compliance_brands():
        for domain in brand.get("domains", []):
            if _matches_domain(hostname, domain):
                return brand
    return None
