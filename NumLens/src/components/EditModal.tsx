import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { OCRBlock } from '../modules/ocr/OCRProcessor';

interface EditModalProps {
  visible: boolean;
  block: OCRBlock | null;
  onSave: (newText: string) => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

/**
 * 100% 신뢰도를 위한 현장용 수동 수정 키패드 (디월트 감성)
 */
export const EditModal: React.FC<EditModalProps> = ({ visible, block, onSave, onClose }) => {
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (block) {
      setInputText(block.text || '');
    }
  }, [block]);

  const handleKeyPress = (key: string) => {
    if (key === 'DEL') {
      setInputText(prev => prev.slice(0, -1));
    } else {
      setInputText(prev => prev + key);
    }
  };

  const handleSave = () => {
    onSave(inputText);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      // onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* 블록 근처에 팝업을 띄우는 느낌을 주기 위한 컨테이너 */}
        <View style={styles.modalContainer}>
          <Text style={styles.headerTitle}>숫자 직접 수정</Text>
          
          <View style={styles.inputBox}>
            <Text style={styles.inputText}>{inputText || '0'}</Text>
          </View>

          {/* 거친 현장용 굵직한 키패드 */}
          <View style={styles.keypadRow}>
            {[1, 2, 3].map(num => (
              <TouchableOpacity key={num} style={styles.keyBtn} onPress={() => handleKeyPress(num.toString())}>
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {[4, 5, 6].map(num => (
              <TouchableOpacity key={num} style={styles.keyBtn} onPress={() => handleKeyPress(num.toString())}>
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {[7, 8, 9].map(num => (
              <TouchableOpacity key={num} style={styles.keyBtn} onPress={() => handleKeyPress(num.toString())}>
                <Text style={styles.keyText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.keypadRow}>
            <TouchableOpacity style={styles.keyBtnSec} onPress={onClose}>
              <Text style={styles.keyTextCancel}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={() => handleKeyPress('0')}>
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyBtnSec} onPress={() => handleKeyPress('DEL')}>
              <Text style={styles.keyTextCancel}>⌫</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>수정 완료 (적용)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#888',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputBox: {
    width: '100%',
    padding: 20,
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFCC00',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputText: {
    color: '#FFCC00',
    fontSize: 48,
    fontWeight: '900',
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  keyBtn: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  keyBtnSec: {
    flex: 1,
    backgroundColor: '#222',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  keyText: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  keyTextCancel: {
    color: '#888',
    fontSize: 24,
    fontWeight: 'bold',
  },
  saveBtn: {
    width: '100%',
    backgroundColor: '#FFCC00',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 20,
    fontWeight: '900',
  }
});
