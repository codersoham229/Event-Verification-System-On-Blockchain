import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { decryptPhoto } from '@/lib/photo-encryption';

interface PhotoViewerProps {
  isOpen: boolean;
  onClose: () => void;
  photoPath: string | null;
  encryptionKey: string | null;
  encryptionIv: string | null;
  requesterName?: string;
}

export function PhotoViewer({ isOpen, onClose, photoPath, encryptionKey, encryptionIv, requesterName }: PhotoViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhoto = useCallback(async () => {
    if (!photoPath || !encryptionKey || !encryptionIv) {
      setError('Missing photo data or encryption keys.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Download encrypted file from Supabase Storage
      const { data, error: downloadError } = await supabase.storage
        .from('enrollment-photos')
        .download(photoPath);

      if (downloadError || !data) {
        throw new Error(downloadError?.message || 'Failed to download photo');
      }

      // Decrypt the photo
      const decryptedBlob = await decryptPhoto(data, encryptionKey, encryptionIv);
      const url = URL.createObjectURL(decryptedBlob);
      setImageUrl(url);
    } catch (err: any) {
      console.error('Error loading photo:', err);
      setError(err.message || 'Failed to load and decrypt photo');
    } finally {
      setLoading(false);
    }
  }, [photoPath, encryptionKey, encryptionIv]);

  useEffect(() => {
    if (isOpen) {
      loadPhoto();
    } else {
      // Cleanup object URL when closing
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
        setImageUrl(null);
      }
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-background border-border text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <span>Enrollment Photo{requesterName ? ` — ${requesterName}` : ''}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Decrypting photo...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mb-3" />
              <p className="text-sm text-destructive font-medium mb-3">{error}</p>
              <Button onClick={loadPhoto} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : imageUrl ? (
            <div className="rounded-lg overflow-hidden border border-border bg-black">
              <img
                src={imageUrl}
                alt={`Enrollment photo for ${requesterName || 'user'}`}
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
