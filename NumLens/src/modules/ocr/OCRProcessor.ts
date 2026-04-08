/**
 * MasterCount OCR Engine Core
 * 현장 맞춤형 톨러런스 정렬 및 오차율 제로(0%) 데이터 정제기
 */

export interface OCRBlock {
  id: string;          // 고유 식별자 (리렌더링 및 클릭 이벤트용)
  text: string;        // 인식된 원본 텍스트
  value: number;       // 숫자 강제 필터링 및 치환 결과값
  x: number;           // 화면 해상도 기준 X 좌표
  y: number;           // 화면 해상도 기준 Y 좌표
  width: number;
  height: number;
  isUncertain: boolean; // 확신도가 일정 수치 이하일 경우 true (수정 유도 빨간 표시)
}

export type SumMode = 'vertical' | 'horizontal';

export class OCRProcessor {
  /**
   * 1. 숫자 전용 필터링 및 강제 예외 치환 (Alias Map)
   * 특수문자, 영문자 중 1로 보일 수 있는 요소들을 전면 강제 치환
   */
  static cleanAndExtractValue(rawText: string): { value: number | null, isUncertain: boolean } {
    let text = rawText.trim();
    
    // 강제 예외 1: 현장 장부에서 많이 쓰는 세로 빗금, 바, 영문자 L/I 등을 모두 '1'로 치환
    const aliasMap: Record<string, string> = {
      '/': '1',
      '|': '1',
      'l': '1',
      'I': '1',
      '\\': '1',
      '✓': '1', // 체크표시 유사 기호
      'v': '1'
    };

    let cleaned = '';
    for (let char of text) {
      if (aliasMap[char]) {
        cleaned += aliasMap[char];
      } else if (/[0-9]/.test(char)) {
        cleaned += char;
      }
    }

    if (cleaned.length === 0) return { value: null, isUncertain: true };

    const val = parseInt(cleaned, 10);
    // 문맥상 앞뒤로 쓰여있던 글자와 심하게 섞여서 이상한 큰 숫자가 되었다면 불확실 체크
    const isUncertain = rawText.length - cleaned.length > 2 || isNaN(val);

    return { value: isNaN(val) ? null : val, isUncertain };
  }

  /**
   * 2. 스마트 정렬 합산 (Tolerance Algorithm)
   * 카메라 좌표 체계를 기반으로 가로축/세로축 그룹핑
   */
  static processBlocks(rawBlocks: any[], mode: SumMode = 'vertical'): OCRBlock[] {
    const blocks: OCRBlock[] = [];

    // Step A. 불순물 제거 및 순수 숫자 객체화
    rawBlocks.forEach((b, index) => {
      const { value, isUncertain } = this.cleanAndExtractValue(b.text || '');
      if (value !== null) {
        blocks.push({
          id: b.id || `ocr-${index}-${Date.now()}`,
          text: b.text,
          value,
          x: b.frame?.x || b.boundingBox?.left || 0,
          y: b.frame?.y || b.boundingBox?.top || 0,
          width: b.frame?.width || b.boundingBox?.width || 0,
          height: b.frame?.height || b.boundingBox?.height || 0,
          isUncertain: isUncertain || (b.confidence && b.confidence < 0.6)
        });
      }
    });

    // Step B. 좌표 기반 정렬
    // 수직 모드(세로 더하기): Y좌표 순으로 먼저 정렬 (위에서 아래로)
    // 수평 모드(가로 더하기): X좌표 순으로 먼저 정렬 (좌에서 우로)
    blocks.sort((a, b) => {
      if (mode === 'vertical') {
        const yDiff = a.y - b.y;
        // Y좌표 15px 이내면 같은 줄로 간주하고 X좌표(왼쪽->오른쪽)순 정렬
        if (Math.abs(yDiff) < 15) return a.x - b.x;
        return yDiff;
      } else {
        const xDiff = a.x - b.x;
        // X좌표 오차가 20px 이내면 동일 열(컬럼)로 간주하고 Y순 정렬
        if (Math.abs(xDiff) < 20) return a.y - b.y;
        return xDiff;
      }
    });

    return blocks;
  }

  /**
   * 블록들의 총합 계산
   */
  static calculateTotalSum(blocks: OCRBlock[]): number {
    return blocks.reduce((acc, curr) => acc + curr.value, 0);
  }
}

/**
 * 프레임 훅 (머신러닝 바인딩 파트)
 */
export function useNumLensOCR() {
  const handleFrame = (frame: any) => {
    // 머신러닝(ML Kit)의 텍스트 인식 결과 배열을 받아 처리하는 훅스
    // ...
  };
  return { handleFrame };
}
