from datetime import datetime

class BriefingWriter:
    def write(self, articles, date_str, total_collected, filtered_count):
        filename = f"briefing_{date_str.replace('-', '')}.md"
        
        total_tokens_estimate = len(articles) * 500 # Very rough estimate
        
        header = f"""# News Briefing - {date_str}

**Generated At:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Total Collected:** {total_collected}
**Filtered Out:** {filtered_count}
**Estimated Tokens:** {total_tokens_estimate}

---

"""
        
        body = ""
        for article in articles:
            body += f"### {article.get('title')}\n"
            body += f"- **Source:** {article.get('source', {}).get('name', 'Unknown')}\n"
            body += f"- **Score:** {article.get('score')}/10\n"
            body += f"- **Link:** [Read More]({article.get('url')})\n\n"
            body += f"**Summary:**\n{article.get('summary')}\n\n"
            body += "---\n\n"
            
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(header + body)
            
        return filename
