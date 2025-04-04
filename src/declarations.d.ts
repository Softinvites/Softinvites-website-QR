declare module 'react-qr-scanner' {
  import { CSSProperties, ImgHTMLAttributes } from 'react';

  export interface QRScannerProps {
    /** 
     * Scan event handler. Called every scan with the decoded value or null if no QR code was found.
     */
    onScan: (result: string | null) => void;
    /**
     * Function to call when an error occurs (e.g. unsupported platform, no available devices, etc.).
     */
    onError: (error: any) => void;
    /**
     * Called when the component is ready for use.
     */
    onLoad?: () => void;
    /**
     * Called when the image in legacyMode is loaded.
     */
    onImageLoad?: ImgHTMLAttributes<HTMLImageElement>['onLoad'];
    /**
     * The delay between scans in milliseconds.
     * To disable continuous scanning, pass false.
     * @default 500
     */
    delay?: number | false;
    /**
     * Specify which camera direction should be used (if available).
     * Options: "front" and "rear".
     */
    facingMode?: 'front' | 'rear';
    /**
     * If the device does not allow camera access (e.g. iOS browsers, Safari),
     * you can enable legacyMode to allow the user to take a picture or use an existing one.
     * You must trigger the image dialog via a user action.
     * @default false
     */
    legacyMode?: boolean;
    /**
     * If legacyMode is active, the image will be downscaled to this value while keeping its aspect ratio.
     * Larger images can increase accuracy but slow processing.
     * @default 1500
     */
    maxImageSize?: number;
    /**
     * Styling for the preview element (video or img in legacyMode).
     * Note: The preview will keep its aspect ratio.
     */
    style?: CSSProperties;
    /**
     * ClassName for the container element.
     */
    className?: string;
    /**
     * Called when choosing which device to use for scanning.
     * Arguments:
     *  - (1) Video devices matching facingMode.
     *  - (2) All video devices.
     * Return the device id (string) to use.
     */
    chooseDeviceId?: (matchingDevices: MediaDeviceInfo[], allDevices: MediaDeviceInfo[]) => string;
    /**
     * Existing MediaStream to use initially.
     */
    initialStream?: MediaStream;
  }

  const QrReader: React.FC<QRScannerProps>;

  export default QrReader;
}
