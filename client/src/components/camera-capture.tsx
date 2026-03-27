import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob, previewUrl: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function CameraCapture({ onCapture, onClose, isOpen }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCameraInner = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      let mediaStream: MediaStream;
      try {
        // Front camera for selfie
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        // Fallback to any available camera
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }

      setCameraActive(true);
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Allow camera access in your browser settings and try again.'
          : err?.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Could not open camera. Please check your device settings.';
      setCameraError(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopCameraInner();
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
  }, [stream, stopCameraInner]);

  // Auto-start when opened; auto-stop when closed
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else if (!isOpen) {
      stopCameraInner();
      setCapturedImage(null);
      setCapturedBlob(null);
      setCameraError(null);
    }

    return () => {
      stopCameraInner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the image horizontally for a natural selfie look
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

    // Compress to JPEG at 80% quality
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedImage(url);
          setCapturedBlob(blob);
          stopCameraInner();
        }
      },
      'image/jpeg',
      0.8
    );
  }, [stopCameraInner]);

  const retake = useCallback(() => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera();
  }, [capturedImage, startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedBlob && capturedImage) {
      onCapture(capturedBlob, capturedImage);
    }
  }, [capturedBlob, capturedImage, onCapture]);

  const handleClose = useCallback(() => {
    stopCamera();
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
    onClose();
  }, [stopCamera, capturedImage, onClose]);

  if (!isOpen) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-white">Take Your Photo</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        A photo is required to complete your enrollment. This photo will be encrypted and securely stored.
      </p>

      {/* Hidden canvas for capturing frames */}
      <canvas ref={canvasRef} className="hidden" />

      {cameraError ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <Camera className="w-10 h-10 text-destructive mx-auto mb-3" />
          <p className="text-sm text-destructive font-medium mb-3">{cameraError}</p>
          <Button onClick={startCamera} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      ) : capturedImage ? (
        /* Photo preview */
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border border-border bg-black aspect-video flex items-center justify-center">
            <img
              src={capturedImage}
              alt="Captured selfie"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={retake} variant="outline" className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
            <Button onClick={confirmPhoto} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              <Check className="w-4 h-4 mr-2" />
              Use This Photo
            </Button>
          </div>
        </div>
      ) : (
        /* Live camera feed */
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border border-border bg-black aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
              playsInline
              muted
            />
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <Camera className="w-10 h-10 text-muted-foreground mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-muted-foreground">Starting camera...</p>
                </div>
              </div>
            )}
          </div>
          <Button
            onClick={takePhoto}
            disabled={!cameraActive}
            className="w-full shadow-glow shadow-primary/20"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </Button>
        </div>
      )}
    </div>
  );
}
