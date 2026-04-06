"""FDA RSS feed ingester for food safety recalls and outbreak investigations.

Source: FDA public RSS feeds (standard RSS 2.0/Atom XML)

Why it matters for seafood compliance:
    The FDA publishes near-real-time notifications of food safety recalls and
    active outbreak investigations via RSS. These feeds are often updated
    hours before the openFDA enforcement API reflects the same events, making
    RSS ingestion critical for early warning. Recalls may involve seafood
    contamination (pathogens, chemical residues, undeclared allergens) while
    outbreak feeds track active multi-state foodborne illness investigations
    that could implicate seafood supply chains.

How the data is fetched:
    We use the `feedparser` library to fetch and parse two FDA RSS feeds.
    feedparser handles both RSS 2.0 and Atom formats transparently, manages
    character encoding issues, and normalizes the entry structure so we get
    consistent field names regardless of the feed format. Each RSS entry
    becomes one record in our system.
"""

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

    # Two complementary feeds that together cover the FDA's food safety
    # notification pipeline:
    #
    # 1. Food Safety Recalls -- voluntary and mandatory recalls of food
    #    products. Includes Class I/II/III recalls, market withdrawals, and
    #    safety alerts. This is the fastest public signal for new recalls.
    #
    # 2. FDA Outbreaks -- active outbreak investigations where FDA is
    #    coordinating with CDC. These can precede formal recalls and provide
    #    early signal about emerging supply chain risks.
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
            # feedparser.parse() fetches the URL and parses the XML in one
            # call. It returns a FeedParserDict with a .entries list. Each
            # entry has normalized fields: title, summary, link, published, id.
            # feedparser silently handles malformed XML, missing fields, and
            # different date formats.
            feed = feedparser.parse(feed_info["url"])

            for entry in feed.entries:
                records.append({
                    # RSS entries should have a unique <id> (or <guid>) element.
                    # Fall back to the entry link if id is missing, since links
                    # are typically unique per announcement.
                    "external_id": entry.get("id") or entry.get("link"),

                    # Store the key RSS fields as JSON. The summary often
                    # contains an HTML snippet with the recall/outbreak details.
                    "raw_content": json.dumps({
                        "title": entry.get("title"),
                        "summary": entry.get("summary"),
                        "link": entry.get("link"),
                        "published": entry.get("published"),
                    }),

                    # Structured metadata for filtering and display.
                    "metadata_json": {
                        "title": entry.get("title", "")[:200],  # truncated for compactness
                        "link": entry.get("link"),
                        # published is the RSS pubDate, e.g. "Fri, 04 Apr 2025 12:00:00 GMT"
                        "published": entry.get("published"),
                        # Tag which feed this entry came from so we can
                        # distinguish recalls from outbreak investigations.
                        "feed": feed_info["label"],
                    },
                })
        return records
