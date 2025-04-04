// src/declarations.d.ts
declare module 'react-qr-scanner' {
  import { CSSProperties } from 'react'

  interface QRScannerProps {
    delay?: number
    style?: CSSProperties
    onError?: (error: any) => void
    onScan?: (data: string | null) => void
    facingMode?: 'user' | 'environment'
    legacyMode?: boolean
    showViewFinder?: boolean
    className?: string
  }

  // Declaring the component as a functional component
  const QrReader: React.FC<QRScannerProps>
  
  export default QrReader
}
