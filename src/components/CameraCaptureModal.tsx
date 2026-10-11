import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Zap, Timer, Check } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Initialize camera
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPreview(null);
      setErrorMsg(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setErrorMsg(null);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      setErrorMsg(
        'Could not access camera. Please check your browser permissions or use file upload.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleSnap = () => {
    if (isTimerActive) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            executeCapture();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      executeCapture();
    }
  };

  const executeCapture = () => {
    if (!videoRef.current) return;

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror image for natural selfie text capture if needed
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedPreview(dataUrl);
  };

  const handleConfirm = () => {
    if (capturedPreview) {
      onCapture(capturedPreview);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedPreview(null);
    startCamera();
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
            <Camera className="w-5 h-5 text-cyan-400" />
            <span>Document Camera Capture</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[360px]">
          {/* Flash animation */}
          {isFlashing && <div className="absolute inset-0 bg-white z-40 opacity-80" />}

          {/* Countdown indicator */}
          {countdown !== null && (
            <div className="absolute z-30 flex items-center justify-center w-20 h-20 rounded-full bg-cyan-500/80 text-white text-4xl font-bold shadow-lg animate-pulse">
              {countdown}
            </div>
          )}

          {errorMsg ? (
            <div className="p-8 text-center max-w-md">
              <Camera className="w-12 h-12 text-rose-400 mx-auto mb-3 opacity-60" />
              <p className="text-slate-300 text-sm leading-relaxed mb-4">{errorMsg}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry Camera
              </button>
            </div>
          ) : capturedPreview ? (
            <img
              src={capturedPreview}
              alt="Captured Document"
              className="w-full h-full object-contain max-h-[60vh]"
            />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[60vh] ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Document Alignment Frame */}
              <div className="absolute inset-8 pointer-events-none border-2 border-dashed border-cyan-400/50 rounded-xl flex items-center justify-center">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-400 -mt-1 -ml-1" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-400 -mt-1 -mr-1" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-400 -mb-1 -ml-1" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-400 -mb-1 -mr-1" />

                <div className="bg-slate-950/70 backdrop-blur-xs text-xs text-slate-300 px-3 py-1.5 rounded-full border border-slate-700/60 shadow">
                  Align receipt, document, or notes inside frame
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          {capturedPreview ? (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={handleRetake}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retake Photo</span>
              </button>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-950/40 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Use This Photo</span>
              </button>
            </div>
          ) : (
            <>
              {/* Optional toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleCameraFacing}
                  className="p-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Switch Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsTimerActive(!isTimerActive)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    isTimerActive
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
                      : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                  title="3-Second Steady Timer"
                >
                  <Timer className="w-3.5 h-3.5" />
                  <span>3s Timer</span>
                </button>
              </div>

              {/* Shutter Button */}
              <button
                onClick={handleSnap}
                disabled={!!errorMsg}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-white hover:bg-slate-100 text-slate-900 shadow-lg shadow-white/10 active:scale-95 transition-all mx-auto border-4 border-slate-800 disabled:opacity-50"
                title="Capture Document"
              >
                <div className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-slate-900" />
                </div>
              </button>

              <div className="w-24 text-right">
                <span className="text-xs text-slate-500">Hold steady</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
