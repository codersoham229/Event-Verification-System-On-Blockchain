import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsQR from 'jsqr';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function QRScanner({ onScan, onClose, isOpen }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsScanning(true);
      
      toast({
        title: "Camera Started",
        description: "Point your camera at a QR code to scan."
      });
    } catch (error: any) {
      toast({
        title: "Camera Access Failed",
        description: "Please allow camera access to scan QR codes.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas to read image data
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast({
            title: "Error",
            description: "Failed to process image",
            variant: "destructive"
          });
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Decode QR code
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          // Extract just the data part (remove URL if present)
          let qrData = code.data;
          
          // If it's a URL like "http://localhost:5000/verify-ticket?eventId=1&ticketId=2"
          // Extract the query parameters
          if (qrData.includes('?')) {
            const urlParams = new URLSearchParams(qrData.split('?')[1]);
            const eventId = urlParams.get('eventId');
            const ticketId = urlParams.get('ticketId');
            
            if (eventId && ticketId) {
              qrData = JSON.stringify({ eventId, ticketId });
            }
          }
          
          onScan(qrData);
          handleClose();
          toast({
            title: "QR Code Scanned",
            description: "QR code successfully decoded from image"
          });
        } else {
          toast({
            title: "No QR Code Found",
            description: "Could not detect a QR code in the image. Please try another image.",
            variant: "destructive"
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    // Reset input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6" data-testid="card-qr-scanner">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            data-testid="button-close-scanner"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {isScanning ? (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover"
                data-testid="video-camera-feed"
              />
              <div className="absolute inset-0 border-2 border-primary rounded-lg m-8 border-dashed"></div>
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600">
                Position the QR code within the frame
              </p>
              <Button
                onClick={stopCamera}
                variant="outline"
                data-testid="button-stop-camera"
              >
                Stop Camera
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
              <Camera className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600 mb-4">Choose a scanning method</p>
              
              <div className="space-y-3">
                <Button
                  onClick={startCamera}
                  className="w-full"
                  data-testid="button-start-camera"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Use Camera
                </Button>
                
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  data-testid="button-upload-image"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="input-file-upload"
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
