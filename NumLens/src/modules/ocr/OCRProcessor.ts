/**
 * OCRProcessor - Vision Camera v4 호환
 * 카메라로 수식을 인식하여 MathParser에 전달합니다.
 * 현재는 Mock OCR 구현체 (실제 ML 연동 전 단계)
 */

export function useNumLensOCR() {
  const handleFrame = () => {
    // Vision Camera v4 Frame Processor는 별도 Worklet 설정 필요
    // 현재는 더미 구현 - 실제 OCR은 추후 ML Kit 연동
  };

  return { handleFrame };
}

export class OCRProcessor {
  static extractMathExpression(text: string): string | null {
    // 수식 패턴 추출: 숫자와 연산자만 남김
    const mathPattern = /[\d\+\-\*\/\.\(\)\s]+/g;
    const matches = text.match(mathPattern);
    if (!matches) return null;
    
    const expression = matches.join('').trim();
    return expression.length > 0 ? expression : null;
  }
}
