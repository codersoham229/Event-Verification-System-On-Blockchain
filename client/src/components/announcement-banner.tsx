import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, X } from 'lucide-react';

interface Announcement {
  id: number;
  message: string;
  priority: 'low' | 'medium' | 'high';
  is_active: boolean;
  created_at: string;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('support_announcements')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);
        if (!error && data) {
          setAnnouncements(data);
        }
      } catch {
        // Fallback to localStorage
        try {
          const stored = JSON.parse(localStorage.getItem('supportAnnouncements') || '[]');
          setAnnouncements(stored.slice(0, 5).map((a: any, i: number) => ({
            id: a.id || i,
            message: a.message,
            priority: a.priority || 'medium',
            is_active: true,
            created_at: a.createdAt || a.created_at,
          })));
        } catch { /* ignore */ }
      }
    };

    fetchAnnouncements();

    // Realtime subscription for new announcements
    const channel = supabase
      .channel('announcements-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_announcements' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const priorityStyles: Record<string, string> = {
    low: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    medium: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    high: 'bg-red-500/10 border-red-500/30 text-red-400',
  };

  return (
    <div className="space-y-1">
      {visible.map(ann => (
        <div
          key={ann.id}
          className={`border px-4 py-2 flex items-center justify-between gap-3 ${priorityStyles[ann.priority] || priorityStyles.medium}`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Megaphone className="h-4 w-4 shrink-0" />
            <p className="text-sm truncate">{ann.message}</p>
          </div>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, ann.id]))}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
