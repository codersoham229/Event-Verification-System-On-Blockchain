import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Share2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  data: string;
  title: string;
  subtitle?: string;
  size?: number;
}

export function QRCodeDisplay({ data, title, subtitle, size = 160 }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Generate QR code using a simple QR library or service
  const generateQRCode = async () => {
    try {
      // Using QR Server API as a fallback - in production, use qrcode.js library
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
      setQrCodeUrl(qrUrl);
    } catch (error) {
      toast({
        title: "QR Code Generation Failed",
        description: "Could not generate QR code. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Download QR code
  const downloadQRCode = async () => {
    try {
      if (!qrCodeUrl) {
        await generateQRCode();
        return;
      }

      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "QR Code Downloaded",
        description: "QR code has been saved to your downloads."
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download QR code. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Share QR code data
  const shareData = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: subtitle || '',
          url: data
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(data);
        toast({
          title: "Copied to Clipboard",
          description: "QR code data has been copied to your clipboard."
        });
      }
    } catch (error) {
      toast({
        title: "Share Failed",
        description: "Could not share QR code data.",
        variant: "destructive"
      });
    }
  };

  // Generate QR code on mount
  useEffect(() => {
    generateQRCode();
  }, [data]);

  return (
    <Card className="p-6 text-center" data-testid="card-qr-code">
      <div className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-8 mb-6">
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt={`QR Code for ${title}`}
            className="w-40 h-40 mx-auto mb-4 rounded"
            data-testid="img-qr-code"
          />
        ) : (
          <div className="w-40 h-40 bg-slate-200 rounded mx-auto mb-4 flex items-center justify-center">
            <QrCode className="w-16 h-16 text-slate-400" />
          </div>
        )}
        <p className="text-sm text-slate-700 font-medium" data-testid="text-qr-title">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 font-mono mt-1" data-testid="text-qr-subtitle">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex space-x-3">
        <Button
          onClick={downloadQRCode}
          variant="outline"
          className="flex-1"
          data-testid="button-download-qr"
        >
          <Download className="w-4 h-4 mr-2" />
          Download QR
        </Button>
        <Button
          onClick={shareData}
          variant="outline"
          className="flex-1"
          data-testid="button-share-qr"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>
    </Card>
  );
}
