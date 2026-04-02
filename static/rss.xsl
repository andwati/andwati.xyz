<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> - RSS Feed</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          :root {
            --bg-color: #f9fafb;
            --text-color: #1a1a1a;
            --text-muted: #6b7280;
            --accent-color: #10b981;
            --hover-color: #059669; /* deeper emerald */
            --card-bg: #ffffff;
            --border-color: rgba(0, 0, 0, 0.05);
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg-color: #0a0a0a;
              --text-color: #f9fafb;
              --text-muted: #a1a1aa;
              --accent-color: #10b981;
              --hover-color: #34d399; /* lighter emerald */
              --card-bg: #141414;
              --border-color: rgba(255, 255, 255, 0.1);
            }
          }
          body {
            font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            line-height: 1.6;
            margin: 0;
            padding: 2rem;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
          }
          a {
            color: var(--accent-color);
            text-decoration: none;
            transition: color 0.2s ease;
          }
          a:hover {
            color: var(--hover-color);
            text-decoration: underline;
          }
          .header {
            margin-bottom: 3rem;
            padding-bottom: 2rem;
            border-bottom: 2px solid var(--border-color);
          }
          .header h1 {
            font-size: 2.5rem;
            margin: 0 0 0.5rem 0;
            color: var(--accent-color);
          }
          .header p {
            font-size: 1.2rem;
            margin: 0;
            opacity: 0.9;
          }
          .notice {
            background-color: var(--card-bg);
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            border-left: 4px solid var(--accent-color);
          }
          .item {
            background-color: var(--card-bg);
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            border: 1px solid var(--border-color);
          }
          .item h2 {
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
          }
          .item .meta {
            font-size: 0.9rem;
            opacity: 0.7;
            margin-bottom: 1rem;
          }
          .btn {
            display: inline-block;
            background-color: var(--accent-color);
            color: var(--bg-color);
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-weight: 600;
            margin-top: 1rem;
          }
          .btn:hover {
            background-color: var(--hover-color);
            color: var(--bg-color);
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p><xsl:value-of select="/rss/channel/description"/></p>
        </div>

        <div class="notice">
          <strong>This is an RSS feed.</strong> Subscribe by copying the URL from your address bar into your news reader app.
        </div>

        <div class="items">
          <xsl:for-each select="/rss/channel/item">
            <div class="item">
              <h2>
                <a href="{link}">
                  <xsl:value-of select="title"/>
                </a>
              </h2>
              <div class="meta">
                Published: <xsl:value-of select="pubDate"/>
              </div>
              <div>
                <xsl:value-of select="substring(description, 1, 250)"/>...
              </div>
              <a href="{link}" class="btn">Read article &#x2192;</a>
            </div>
          </xsl:for-each>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
