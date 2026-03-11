import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { Camera, XCircle, RefreshCw } from 'lucide-react'
import Button from './Button'

/**
 * QRScanner — Opens the device camera and scans for QR codes.
 *
 * Props:
 *   onScanSuccess(decodedText) — called when a valid QR code is scanned
 *   onClose() — called when the user wants to close the scanner
 */
export default function QRScanner({ onScanSuccess, onClose }) {
  const html5QrRef = useRef(null)
  const mountedRef = useRef(true)
  const [error, setError] = useState(null)
  const [isStarting, setIsStarting] = useState(true)

  useEffect(() => {
    mountedRef.current = true
    const scannerId = 'qr-scanner-region'

    // Small delay to let the DOM render the scanner div
    const timeout = setTimeout(async () => {
      if (!mountedRef.current) return

      try {
        const html5QrCode = new Html5Qrcode(scannerId)
        html5QrRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // QR code successfully scanned — stop first, then callback
            const state = html5QrCode.getState()
            if (
              state === Html5QrcodeScannerState.SCANNING ||
              state === Html5QrcodeScannerState.PAUSED
            ) {
              html5QrCode
                .stop()
                .then(() => {
                  html5QrRef.current = null
                  if (mountedRef.current) {
                    onScanSuccess(decodedText)
                  }
                })
                .catch(() => {
                  // Already stopped
                  html5QrRef.current = null
                  if (mountedRef.current) {
                    onScanSuccess(decodedText)
                  }
                })
            } else {
              if (mountedRef.current) {
                onScanSuccess(decodedText)
              }
            }
          },
          () => {
            // QR scan failure — no QR in frame yet (ignore)
          }
        )

        if (mountedRef.current) {
          setIsStarting(false)
        }
      } catch (err) {
        console.error('QR Scanner error:', err)
        if (!mountedRef.current) return

        setIsStarting(false)

        const errStr = String(err)
        if (errStr.includes('NotAllowedError') || errStr.includes('Permission')) {
          setError(
            'Camera permission denied. Please allow camera access in your browser settings and try again.'
          )
        } else if (errStr.includes('NotFoundError') || errStr.includes('no video') || errStr.includes('Requested device not found')) {
          setError(
            'No camera found on this device. Please use a phone with a camera, or enter the temple code manually below.'
          )
        } else {
          setError(
            'Could not start the camera. Try again or enter the temple code manually.'
          )
        }
      }
    }, 300)

    // Cleanup
    return () => {
      mountedRef.current = false
      clearTimeout(timeout)

      const scanner = html5QrRef.current
      if (scanner) {
        try {
          const state = scanner.getState()
          if (
            state === Html5QrcodeScannerState.SCANNING ||
            state === Html5QrcodeScannerState.PAUSED
          ) {
            scanner.stop().catch(() => {})
          }
        } catch {
          // Scanner not initialised or already cleaned up
        }
        html5QrRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#F59E0B]" />
            <h3 className="text-lg font-semibold text-[#1E293B]">
              Scan Temple QR Code
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close scanner"
          >
            <XCircle className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="relative">
          {isStarting && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10"
              style={{ minHeight: '300px' }}
            >
              <div className="text-center">
                <div className="w-10 h-10 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-white text-sm">Starting camera...</p>
              </div>
            </div>
          )}

          {error ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-sm text-red-700 mb-4 leading-relaxed">
                {error}
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Enter Code Instead
                </Button>
              </div>
            </div>
          ) : (
            <div
              id="qr-scanner-region"
              style={{ minHeight: '300px', width: '100%' }}
            />
          )}
        </div>

        {/* Footer */}
        {!error && (
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Point your camera at the QR code displayed at the temple entrance.
              The code contains your temple ID for automatic check-in.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
