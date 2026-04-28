import os
import sys
import json
from datetime import datetime
from dotenv import load_dotenv

from agent.fetcher import NewsFetcher
from agent.scorer import NewsScorer
from agent.summarizer import NewsSummarizer
from agent.writer import BriefingWriter

def main():
    load_dotenv()
    
    if len(sys.argv) < 2:
        print("Usage: python main.py <path_to_config_json>")
        sys.exit(1)
        
    config_path = sys.argv[1]
    if not os.path.exists(config_path):
        print(f"Error: Config file {config_path} not found.")
        sys.exit(1)
        
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
        
    keywords = config.get("keywords", [])
    if not keywords:
        print("Error: Keywords list is empty. Aborting.")
        sys.exit(0)
        
    date_str = config.get("date", datetime.now().strftime("%Y-%m-%d"))
    max_articles = config.get("max_articles", 10)
    lang = config.get("briefing_lang", "ko")
    
    print(f"[*] Starting news briefing agent for keywords: {keywords}")
    
    # 1. Fetch
    fetcher = NewsFetcher(api_key=os.getenv("NEWS_API_KEY"))
    articles = fetcher.fetch(keywords, max_articles)
    
    if not articles:
        print("[-] No articles found. Aborting.")
        sys.exit(0)
        
    print(f"[+] Collected {len(articles)} articles.")
    
    # 2. Score & Filter
    scorer = NewsScorer(api_key=os.getenv("GEMINI_API_KEY"))
    scored_articles = scorer.score_articles(articles, keywords)
    
    # Deduplicate by URL
    seen_urls = set()
    unique_articles = []
    for art in scored_articles:
        if art['url'] not in seen_urls:
            unique_articles.append(art)
            seen_urls.add(art['url'])
            
    # Filter by score
    filtered_articles = [art for art in unique_articles if art['score'] >= 3]
    
    filtering_count = len(unique_articles) - len(filtered_articles)
    if filtering_count > 0.7 * len(unique_articles):
        print("WARNING: More than 70% of articles were filtered out due to low relevance.")
    
    print(f"[+] {len(filtered_articles)} articles remaining after scoring and filtering.")
    
    if not filtered_articles:
        print("[-] All articles filtered out. No briefing generated.")
        sys.exit(0)
        
    # 3. Summarize
    summarizer = NewsSummarizer(api_key=os.getenv("GEMINI_API_KEY"))
    briefed_articles = summarizer.summarize_articles(filtered_articles, lang)
    
    # 4. Write
    writer = BriefingWriter()
    output_file = writer.write(briefed_articles, date_str, len(articles), filtering_count)
    
    print(f"[!] Briefing generated: {output_file}")

if __name__ == "__main__":
    main()
