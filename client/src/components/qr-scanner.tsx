import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Upload, ZapOff, ScanLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function QRScanner({ onScan, onClose, isOpen }: QRScannerProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ── Scanning loop – reads frames from live video and decodes QR ────────────
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      stopCameraInner();
      onScan(code.data);
      onClose();
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onScan, onClose]);

  // Inner stop — doesn't depend on stream state so safe to call inside callbacks
  const stopCameraInner = () => {
    cancelAnimationFrame(rafRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setScanning(false);
  };

  // ── Start camera ───────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      // Try rear/environment camera first, fall back to any camera
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // playsinline is mandatory for iOS Safari — without it video never plays inline
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }

      setScanning(true);
      rafRef.current = requestAnimationFrame(tick);
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in your browser settings and try again.'
          : err?.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Could not open camera. Try uploading an image of the QR code instead.';
      setCameraError(msg);
    }
  }, [tick]);

  // ── Stop camera ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, [stream]);

  // Auto-start when dialog opens; auto-stop when it closes
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      cancelAnimationFrame(rafRef.current);
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
      setStream(null);
      setScanning(false);
    }
    return () => { cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── File upload fallback ───────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          // Pass raw QR string — handleQRScan handles URL / JSON / legacy formats
          onScan(code.data);
          onClose();
          toast({ title: 'QR Code Scanned ✅', description: 'Decoded from uploaded image.' });
        } else {
          toast({ title: 'No QR Found', description: 'Could not detect a QR code in the image.', variant: 'destructive' });
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => { stopCamera(); onClose(); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" style={{ touchAction: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <span className="text-white font-semibold text-sm flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-emerald-400" />
          Scan Ticket QR Code
        </span>
        <button onClick={handleClose} className="text-white p-2 rounded-full hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera / error area */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {cameraError ? (
          <div className="text-center px-8 space-y-4">
            <ZapOff className="w-14 h-14 text-red-400 mx-auto" />
            <p className="text-red-400 text-sm leading-relaxed">{cameraError}</p>
            <Button onClick={startCamera} variant="outline" className="border-white/30 text-white">
              Retry Camera
            </Button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              autoPlay
              muted
            />
            {/* Hidden canvas for frame decoding */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Dark mask around the viewfinder */}
              <div className="absolute inset-0 bg-black/40" />
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 z-10">
                {/* Clear window */}
                <div className="absolute inset-0 bg-transparent" />
                {/* Corner brackets */}
                <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
                <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
                <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
                <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />
                {/* Animated scan line */}
                {scanning && (
                  <span className="absolute left-1 right-1 h-0.5 bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.6)]" style={{ animation: 'scanline 2s ease-in-out infinite' }} />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-black px-4 py-4 space-y-3">
        <p className="text-center text-slate-400 text-xs">
          {scanning ? 'Hold steady — scanning automatically' : cameraError ? 'Upload a screenshot of the QR code' : 'Starting camera…'}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-white/20 text-white hover:bg-white/10 text-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Image
          </Button>
          {scanning ? (
            <Button variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10 text-sm" onClick={stopCamera}>
              Stop
            </Button>
          ) : (
            !cameraError && (
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm" onClick={startCamera}>
                Start Camera
              </Button>
            )
          )}
        </div>
        {/* capture="environment" tells mobile browsers to open the rear camera directly */}
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
      </div>

      <style>{`
        @keyframes scanline {
          0%   { top: 0%;   opacity: 1; }
          50%  { top: calc(100% - 2px); opacity: 0.7; }
          100% { top: 0%;   opacity: 1; }
        }
      `}</style>
    </div>
  );
}