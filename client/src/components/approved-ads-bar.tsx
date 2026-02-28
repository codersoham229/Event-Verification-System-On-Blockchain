import { useState, useEffect } from 'react';
import { X, ExternalLink, Megaphone } from 'lucide-react';

interface ApprovedAd {
  id: string | number;
  business_name: string;
  ad_type: string;
  description: string;
  contact_email: string;
  image_url?: string;
  status: string;
  requested_at: string;
  removed_from_site?: boolean;
}

export function ApprovedAdsBar() {
  const [ads, setAds] = useState<ApprovedAd[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const load = () => {
      try {
        const raw: ApprovedAd[] = JSON.parse(localStorage.getItem('adRequests') || '[]');
        setAds(raw.filter(a => a.status === 'accepted' && !a.removed_from_site));
      } catch { setAds([]); }
    };
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  const visible = ads.filter(a => !dismissed.has(String(a.id)));

  useEffect(() => {
    if (visible.length > 1) {
      const t = setInterval(() => setCurrent(c => (c + 1) % visible.length), 6000);
      return () => clearInterval(t);
    }
  }, [visible.length]);

  if (visible.length === 0) return null;

  const ad = visible[current % visible.length];

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-y border-amber-500/25 py-2.5 px-4">
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {/* Sponsor label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Megaphone className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Sponsored</span>
        </div>

        <div className="w-px h-4 bg-amber-500/30 shrink-0" />

        {/* Ad image */}
        {ad.image_url && (
          <img src={ad.image_url} alt={ad.business_name} className="h-7 w-auto rounded object-cover shrink-0 border border-amber-500/20 hidden sm:block" />
        )}

        {/* Business name */}
        <span className="text-white font-bold text-sm shrink-0">{ad.business_name}</span>

        <span className="text-amber-400/50 text-xs shrink-0">—</span>

        {/* Description */}
        <p className="text-slate-300 text-xs truncate flex-1">{ad.description}</p>

        {/* Contact link */}
        <a
          href={`mailto:${ad.contact_email}`}
          className="shrink-0 text-[10px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
        >
          Learn more <ExternalLink className="h-3 w-3" />
        </a>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(s => new Set([...s, String(ad.id)]))}
          className="shrink-0 text-muted-foreground hover:text-white transition-colors ml-1"
          title="Dismiss this ad"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Dots if multiple ads */}
      {visible.length > 1 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {visible.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === current % visible.length ? 'bg-amber-400' : 'bg-amber-400/25'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
