import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { OCRBlock } from '../modules/ocr/OCRProcessor';

interface HighlightOverlayProps {
  blocks: OCRBlock[];
  onBlockTouch: (block: OCRBlock) => void;
}

/**
 * 100% 신뢰도를 부여하는 직관적 시각 피드백 레이어
 * 기계가 읽어들인 x, y 영역 위에 투명한 형광펜 효과를 입힘
 */
export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({ blocks, onBlockTouch }) => {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {blocks.map((block) => {
        // 기계가 헷갈려하는 문자는 빨간색, 확신하는 문자는 디월트 옐로우 피드백
        const highlightColor = block.isUncertain 
          ? 'rgba(255, 59, 48, 0.4)' // iOS Alert Red
          : 'rgba(255, 204, 0, 0.4)'; // DeWalt Yellow Highlighter
        
        const borderColor = block.isUncertain 
          ? 'rgba(255, 59, 48, 0.8)' 
          : 'rgba(255, 204, 0, 0.8)';

        return (
          <TouchableOpacity
            key={block.id}
            onPress={() => onBlockTouch(block)}
            activeOpacity={0.7}
            style={{
              position: 'absolute',
              left: block.x,
              top: block.y,
              width: block.width > 0 ? block.width : 20, // OCR에 따라 width 0일 경우 대비 최소값
              height: block.height > 0 ? block.height : 25,
              backgroundColor: highlightColor,
              borderWidth: 2,
              borderColor: borderColor,
              borderRadius: 4,
            }}
          />
        );
      })}
    </View>
  );
};
