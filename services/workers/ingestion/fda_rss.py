import json

import feedparser

from ingestion.base import BaseIngester


class FDARSSIngester(BaseIngester):
    """Ingest FDA RSS feeds for food safety recalls and outbreaks.

    Feeds:
    - Food Safety Recalls: https://www.fda.gov/.../food-safety-recalls/rss.xml
    - FDA Outbreaks: https://www.fda.gov/.../fda-outbreaks/rss.xml

    No authentication required. Standard RSS/Atom format.
    """

    source_name = "FDA RSS Feeds"
    source_id = "fda_rss"

    FEEDS = [
        {
            "url": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-safety-recalls/rss.xml",
            "label": "FDA Food Safety Recalls",
        },
        {
            "url": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/fda-outbreaks/rss.xml",
            "label": "FDA Outbreaks",
        },
    ]

    def fetch(self) -> list[dict]:
        records = []
        for feed_info in self.FEEDS:
            feed = feedparser.parse(feed_info["url"])
            for entry in feed.entries:
                records.append({
                    "external_id": entry.get("id") or entry.get("link"),
                    "raw_content": json.dumps({
                        "title": entry.get("title"),
                        "summary": entry.get("summary"),
                        "link": entry.get("link"),
                        "published": entry.get("published"),
                    }),
                    "metadata_json": {
                        "title": entry.get("title", "")[:200],
                        "link": entry.get("link"),
                        "published": entry.get("published"),
                        "feed": feed_info["label"],
                    },
                })
        return records
