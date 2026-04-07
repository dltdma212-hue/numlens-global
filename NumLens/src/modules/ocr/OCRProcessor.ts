import { useTextRecognition } from 'react-native-vision-camera-ocr-plus';
import { MathParser } from '../math/MathParser';

/**
 * NumLens OCR Processor
 * Handles the camera frame processing for text detection.
 * Optimized for low-latency, real-time performance (John Carmack requirement).
 */
export class OCRProcessor {
  /**
   * Main processing line.
   * Takes recognized blocks and filters for mathematical expressions.
   * @param blocks Recognized text blocks from vision-camera-ocr
   * @returns The most likely mathematical expression result.
   */
  static processText(blocks: any[]): string | null {
    if (!blocks || blocks.length === 0) return null;

    // Filter blocks that look like mathematical expressions
    // Usually, numbers and operators are short/dense.
    const mathCandidate = blocks
      .map(block => block.text)
      .find(text => /[\d+\-*/÷xX]/.test(text)); // Contains math symbols

    if (mathCandidate) {
      return MathParser.evaluate(mathCandidate);
    }

    return null;
  }
}

/**
 * React Hook for handling OCR Camera Stream
 * For use within CameraOverlay component.
 */
export const useNumLensOCR = () => {
  const { scanText } = useTextRecognition();

  const handleFrame = (frame: any) => {
    'worklet'; // John Carmack says use worklets for 0.05s latency
    const result = scanText(frame);
    // Further processing on UI thread if needed
    return result;
  };

  return { handleFrame };
};
