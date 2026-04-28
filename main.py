import os
import sys
import json
import argparse
from datetime import datetime
from dotenv import load_dotenv

from agent.fetcher import NewsFetcher
from agent.scorer import NewsScorer
from agent.summarizer import NewsSummarizer
from agent.writer import BriefingWriter

TOKEN_WARN = 40_000
TOKEN_LIMIT = 50_000

def check_tokens(counter):
    t = counter['total']
    if t > TOKEN_LIMIT:
        print(f"ERROR: 토큰 한도(50,000)를 초과했습니다. 실행을 중단합니다.")
        sys.exit(1)
    if t >= TOKEN_WARN:
        print(f"WARNING: 누적 토큰 사용량이 40,000에 도달했습니다. 현재: {t}")

def main():
    load_dotenv()

    parser = argparse.ArgumentParser()
    parser.add_argument('--input', dest='input_path')
    parser.add_argument('input_positional', nargs='?')
    args = parser.parse_args()

    config_path = args.input_path or args.input_positional
    if not config_path:
        print("Usage: python main.py --input <path_to_config_json>")
        sys.exit(1)
    if not os.path.exists(config_path):
        print(f"Error: Config file {config_path} not found.")
        sys.exit(1)

    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)

    keywords = config.get("keywords", [])
    if not keywords:
        print("ERROR: 키워드가 없습니다")
        sys.exit(0)

    date_str = config.get("date", datetime.now().strftime("%Y-%m-%d"))
    max_articles = config.get("max_articles", 10)
    lang = config.get("briefing_lang", "ko")
    keyword_operators = config.get("keyword_operators", None)

    print(f"[*] Starting news briefing agent for keywords: {keywords}")

    # 1. Fetch
    fetcher = NewsFetcher(api_key=os.getenv("NEWS_API_KEY"))
    articles = fetcher.fetch(keywords, max_articles, keyword_operators)
    if articles is None:
        sys.exit(1)
    if not articles:
        print("[-] No articles found. Aborting.")
        sys.exit(0)
    print(f"[+] Collected {len(articles)} articles.")

    token_counter = {'total': 0}

    # 2. Score
    scorer = NewsScorer(api_key=os.getenv("GEMINI_API_KEY"), token_counter=token_counter)
    scored_articles = scorer.score_articles(articles, keywords)
    check_tokens(token_counter)

    # 3. Deduplicate by URL
    seen_urls = set()
    unique_articles = []
    for art in scored_articles:
        if art['url'] not in seen_urls:
            unique_articles.append(art)
            seen_urls.add(art['url'])

    # 4. Filter by score
    filtered_articles = [a for a in unique_articles if a['score'] >= 3]
    filtering_count = len(unique_articles) - len(filtered_articles)
    if len(unique_articles) > 0 and filtering_count > 0.7 * len(unique_articles):
        print("WARNING: 관련 기사가 적습니다")

    print(f"[+] {len(filtered_articles)} articles remaining after scoring and filtering.")
    if not filtered_articles:
        print("[-] All articles filtered out. No briefing generated.")
        sys.exit(0)

    # 5. Summarize
    summarizer = NewsSummarizer(api_key=os.getenv("GEMINI_API_KEY"), token_counter=token_counter)
    briefed_articles = summarizer.summarize_articles(filtered_articles, lang)
    check_tokens(token_counter)

    # 6. Write
    writer = BriefingWriter()
    output_file = writer.write(briefed_articles, date_str, len(articles), filtering_count, token_counter['total'])
    print(f"[!] Briefing generated: {output_file}")

if __name__ == "__main__":
    main()
