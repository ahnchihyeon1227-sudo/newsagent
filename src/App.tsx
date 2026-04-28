import React, { useState } from 'react';
import { Plus, Trash2, Loader2, Search, ExternalLink, Clock } from 'lucide-react';

type Keyword = { text: string; op: 'OR' | 'AND' };
type HistoryItem = { id: number; title: string; date: string; markdown: string };

export default function App() {
  const [keywords, setKeywords] = useState<Keyword[]>([
    { text: 'AI', op: 'OR' },
    { text: '반도체', op: 'OR' },
    { text: '애플', op: 'OR' },
  ]);
  const [input, setInput] = useState('');
  const [maxArticles, setMaxArticles] = useState(10);
  const [lang, setLang] = useState('ko');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  const addKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const kw = input.trim();
    if (kw && !keywords.find(k => k.text === kw)) {
      setKeywords([...keywords, { text: kw, op: 'OR' }]);
    }
    setInput('');
  };

  const toggleOp = (i: number) => {
    setKeywords(prev => prev.map((k, idx) => idx === i ? { ...k, op: k.op === 'OR' ? 'AND' : 'OR' } : k));
  };

  const removeKeyword = (text: string) => setKeywords(keywords.filter(k => k.text !== text));

  const run = async () => {
    setLoading(true);
    setError('');
    setSelected(null);
    try {
      // operators between keywords: keyword[0] op[0] keyword[1] op[1] keyword[2]...
      // op[i] is the operator AFTER keyword[i], so we use keywords[1..].map(k => k.op)
      const keyword_operators = keywords.slice(1).map(k => k.op);
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywords.map(k => k.text), keyword_operators, maxArticles, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const item: HistoryItem = { id: Date.now(), title: data.title, date: data.date, markdown: data.markdown };
      setHistory(prev => [item, ...prev]);
      setSelected(item);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f4] font-sans">
      <header className="h-14 bg-white border-b border-[#e5e5e5] flex items-center px-8 gap-3">
        <Search className="w-5 h-5 text-[#404040]" />
        <h1 className="font-bold text-[#404040] text-lg tracking-tight">News Agent</h1>
      </header>

      <div className="max-w-5xl mx-auto p-8 grid grid-cols-[280px_1fr] gap-6">
        {/* Left: config + history */}
        <div className="space-y-4">
          {/* Config */}
          <div className="bg-white border border-[#e5e5e5] rounded-lg p-5 space-y-4">
            <h2 className="text-xs font-bold text-[#404040] uppercase tracking-widest">키워드</h2>

            <div className="space-y-2">
              {keywords.map((kw, i) => (
                <div key={kw.text} className="flex items-center gap-2">
                  {/* OR/AND toggle — shown before keyword except first */}
                  {i > 0 && (
                    <button onClick={() => toggleOp(i)}
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors ${kw.op === 'OR' ? 'bg-[#f5f5f4] border-[#e5e5e5] text-[#a3a3a3]' : 'bg-[#404040] border-[#404040] text-white'}`}>
                      {kw.op}
                    </button>
                  )}
                  {i === 0 && <div className="w-[34px]" />}
                  <span className="flex-1 flex items-center justify-between px-2.5 py-1 bg-[#f5f5f4] border border-[#e5e5e5] rounded text-sm text-[#404040]">
                    {kw.text}
                    <button onClick={() => removeKeyword(kw.text)}>
                      <Trash2 className="w-3 h-3 text-[#a3a3a3] hover:text-[#404040]" />
                    </button>
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={addKeyword} className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="키워드 추가..."
                className="flex-1 border border-[#e5e5e5] rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#404040]" />
              <button type="submit" className="px-2.5 py-1.5 bg-[#f5f5f4] border border-[#e5e5e5] rounded hover:bg-[#e5e5e5]">
                <Plus className="w-4 h-4 text-[#404040]" />
              </button>
            </form>

            <div className="flex gap-3 pt-1">
              <label className="text-[10px] text-[#a3a3a3] font-bold uppercase tracking-widest flex items-center gap-1.5">
                기사 수
                <select value={maxArticles} onChange={e => setMaxArticles(Number(e.target.value))}
                  className="border border-[#e5e5e5] rounded px-1.5 py-0.5 text-xs text-[#404040] font-normal">
                  <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                </select>
              </label>
              <label className="text-[10px] text-[#a3a3a3] font-bold uppercase tracking-widest flex items-center gap-1.5">
                언어
                <select value={lang} onChange={e => setLang(e.target.value)}
                  className="border border-[#e5e5e5] rounded px-1.5 py-0.5 text-xs text-[#404040] font-normal">
                  <option value="ko">한국어</option><option value="en">English</option>
                </select>
              </label>
            </div>

            <button onClick={run} disabled={loading || keywords.length === 0}
              className="w-full py-2 bg-[#404040] text-white rounded font-bold text-sm hover:bg-[#262626] disabled:bg-[#a3a3a3] flex items-center justify-center gap-2 transition-colors">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />생성 중...</> : '브리핑 생성'}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white border border-[#e5e5e5] rounded-lg p-5 space-y-2">
              <h2 className="text-xs font-bold text-[#404040] uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> 히스토리
              </h2>
              {history.map(item => (
                <div key={item.id}
                  className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer border transition-colors ${selected?.id === item.id ? 'border-[#404040] bg-[#f5f5f4]' : 'border-[#e5e5e5] hover:bg-[#f5f5f4]'}`}
                  onClick={() => setSelected(item)}>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#404040] truncate">{item.title}</p>
                    <p className="text-[10px] text-[#a3a3a3]">{item.date}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setHistory(h => h.filter(x => x.id !== item.id)); if (selected?.id === item.id) setSelected(null); }}
                    className="ml-2 shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-[#a3a3a3] hover:text-[#404040]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: result */}
        <div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4">{error}</div>}
          {selected ? <MarkdownBriefing markdown={selected.markdown} /> : (
            <div className="h-64 flex items-center justify-center text-[#a3a3a3] text-sm border border-dashed border-[#e5e5e5] rounded-lg">
              키워드를 설정하고 브리핑을 생성하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MarkdownBriefing({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');

  const renderLine = (line: string, i: number) => {
    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black text-[#404040] mb-4">{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-[#404040] mt-6 mb-2">{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold text-[#404040] mt-6 mb-2 border-l-4 border-[#404040] pl-3">{line.slice(4)}</h3>;
    if (line.trim() === '---') return <hr key={i} className="border-[#e5e5e5] my-4" />;
    if (line.trim() === '') return <div key={i} className="h-1" />;
    if (line.startsWith('- **Link:**')) {
      const match = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (match) return (
        <div key={i} className="mt-2">
          <a href={match[2]} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#404040] text-white text-xs font-bold rounded hover:bg-[#262626] transition-colors">
            <ExternalLink className="w-3 h-3" />{match[1]}
          </a>
        </div>
      );
    }
    if (line.startsWith('- **') || line.startsWith('**')) {
      const html = line.replace(/^-\s*/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="text-sm text-[#404040] leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return <p key={i} className="text-sm text-[#a3a3a3] leading-relaxed">{line}</p>;
  };

  return (
    <div className="bg-white border border-[#e5e5e5] rounded-lg p-6 space-y-1">
      {lines.map((line, i) => renderLine(line, i))}
    </div>
  );
}
