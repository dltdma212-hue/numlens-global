import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, ScrollView, Animated, Easing, Vibration, Dimensions, FlatList, Modal, TextInput, Share, Switch } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const CROP_WIDTH = width * 0.9;
const CROP_HEIGHT = height * 0.7;

export default function OCRScreen() {
    const { hasPermission, requestPermission } = useCameraPermission();
    const [mediaPermissionResponse, requestMediaPermission] = MediaLibrary.usePermissions();
    const device = useCameraDevice('back');

    const cameraRef = useRef(null);
    const viewShotRef = useRef(null);

    const [photo, setPhoto] = useState(null);
    const [scannedItems, setScannedItems] = useState([]);
    const [totalSum, setTotalSum] = useState(0);
    
    const [status, setStatus] = useState("대기중");
    const [errorLog, setErrorLog] = useState("");
    
    const scannerAnim = useRef(new Animated.Value(0)).current;

    // 모달 관리 상태들
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editIndex, setEditIndex] = useState(null);
    const [editText, setEditText] = useState("");
    
    // 🔥 과기록(History) 저장소 상태
    const [historyList, setHistoryList] = useState([]);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    // ⚙️ 스캐너 설정 상태 (블라인드, 합산모드)
    const [isBlindZone, setIsBlindZone] = useState(false);
    const [calcMode, setCalcMode] = useState("ALL");
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);

    useEffect(() => {
        if (!hasPermission) requestPermission();
        loadHistory(); 
        loadSettings();
    }, [hasPermission]);

    const loadSettings = async () => {
        try {
            const storedBlind = await AsyncStorage.getItem('@numlens_blind');
            if (storedBlind !== null) setIsBlindZone(storedBlind === 'true');
            const storedMode = await AsyncStorage.getItem('@numlens_calcmode');
            if (storedMode !== null) setCalcMode(storedMode);
        } catch (e) {}
    };

    const saveSettings = (blind, mode) => {
        AsyncStorage.setItem('@numlens_blind', String(blind));
        AsyncStorage.setItem('@numlens_calcmode', mode);
    };

    // DB (AsyncStorage) 읽기
    const loadHistory = async () => {
        try {
            const data = await AsyncStorage.getItem('@numlens_history');
            if (data !== null) {
                setHistoryList(JSON.parse(data));
            }
        } catch (e) {
            console.log("기록 불러오기 실패", e);
        }
    };

    const startScanner = () => {
        scannerAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(scannerAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(scannerAnim, { toValue: 0, duration: 2000, easing: Easing.linear, useNativeDriver: true })
            ])
        ).start();
    };

    const stopScanner = () => {
        scannerAnim.stopAnimation();
    };

    // 🧩 스마트 다차원 그리드 해석 엔진
    const parseGridExpressions = (result, currentBlind, currentMode) => {
        if (!result || !result.blocks) return { sum: 0, list: [] };

        let elements = [];
        result.blocks.forEach(b => {
            if(b.lines) {
                b.lines.forEach(l => {
                    elements.push({ text: l.text, frame: l.frame });
                });
            }
        });

        // 좌측 날짜 영역 무시 로직
        if (currentBlind) {
            let maxX = 0;
            elements.forEach(el => {
                if(el.frame && (el.frame.x + el.frame.width) > maxX) maxX = el.frame.x + el.frame.width;
            });
            const blindThresholdImg = maxX * 0.22; // 카메라 폭의 22% 선
            elements = elements.filter(el => !el.frame || el.frame.x > blindThresholdImg);
        }

        let validItems = [];
        elements.forEach(el => {
            let cleanText = el.text.replace(/x/gi, '*').replace(/×/g, '*').replace(/÷/g, '/');
            cleanText = cleanText.replace(/[^0-9+\-*/.]/g, ' ');
            const parts = cleanText.split(' ').filter(b => b.length > 0);
            
            parts.forEach(p => {
                 let mathStr = p.replace(/^[+\-*/.]+|[+\-*/.]+$/g, '');
                 if(mathStr.length > 0) {
                     validItems.push({ text: mathStr, frame: el.frame });
                 }
            });
        });

        let sum = 0;
        const finalGroups = [];

        // 🌎 전체 합산 모드 (레거시 모드 호환)
        if (currentMode === "ALL") {
            validItems.forEach(item => {
                try {
                    const val = Number(new Function('return ' + item.text)());
                    if(!isNaN(val) && val > 0) {
                        finalGroups.push({ original: item.text, value: val });
                        sum += val;
                    }
                } catch(e){}
            });
            return { sum, list: finalGroups };
        }

        // ⬇️ 세로 묶음 및 ➡️ 가로 묶음 클러스터링
        let maxCoord = 0;
        validItems.forEach(item => {
            let c = currentMode === "COL" ? (item.frame?.x || 0) : (item.frame?.y || 0);
            if(c > maxCoord) maxCoord = c;
        });
        const THRESHOLD = maxCoord * 0.08; // 해당 축 최대 해상도의 8% 이내면 같은 줄로 판정

        let sortedItems = [];
        if (currentMode === "COL") {
            sortedItems = [...validItems].sort((a,b) => (a.frame?.x || 0) - (b.frame?.x || 0));
        } else {
            sortedItems = [...validItems].sort((a,b) => (a.frame?.y || 0) - (b.frame?.y || 0));
        }

        let currentGroup = [];
        let lastCoord = -1000;

        const processGroup = (group) => {
            // 그룹 내부 정렬 (세로모드면 상단->하단으로 식을 묶음, 가로모드면 왼쪽->오른쪽)
            if(currentMode === "COL") group.sort((a,b) => (a.frame?.y || 0) - (b.frame?.y || 0));
            else group.sort((a,b) => (a.frame?.x || 0) - (b.frame?.x || 0));

            let lineOriginal = "";
            let lineSum = 0;
            
            group.forEach(g => {
                try {
                    const val = Number(new Function('return ' + g.text)());
                    if(!isNaN(val) && val > 0) {
                        if(lineOriginal !== "") lineOriginal += "+";
                        lineOriginal += g.text;
                        lineSum += val;
                    }
                }catch(e){}
            });

            if(lineSum > 0) {
                finalGroups.push({ original: lineOriginal, value: lineSum });
                sum += lineSum;
            }
        };

        sortedItems.forEach(item => {
            const coord = currentMode === "COL" ? (item.frame?.x || 0) : (item.frame?.y || 0);
            if (currentGroup.length === 0 || Math.abs(coord - lastCoord) < THRESHOLD) {
                currentGroup.push(item);
                lastCoord = coord;
            } else {
                processGroup(currentGroup);
                currentGroup = [item];
                lastCoord = coord;
            }
        });
        if (currentGroup.length > 0) processGroup(currentGroup);

        return { sum, list: finalGroups };
    };

    const takePictureAndProcess = async () => {
        Vibration.vibrate(50);
        setErrorLog(""); 
        setPhoto(null);
        setStatus("동체 추적 연속 스캔 중...📸");
        startScanner();

        try {
            if (!cameraRef.current) throw new Error("카메라 렌즈 불안정.");
            if (!mediaPermissionResponse?.granted) {
                const permission = await requestMediaPermission();
                if (!permission.granted) throw new Error("사진첩 저장 권한 필요.");
            }

            const rawImages = [];
            const recognizedTexts = [];

            for (let i = 0; i < 3; i++) {
                const file = await cameraRef.current.takePhoto({ qualityPrioritization: 'speed' });
                const imageUri = file.path.startsWith('file://') ? file.path : `file://${file.path}`;
                if (i === 1) rawImages.push(imageUri); 
                
                const result = await TextRecognition.recognize(imageUri);
                if (result) recognizedTexts.push(result);
                
                await new Promise(r => setTimeout(r, 150));
            }

            if (recognizedTexts.length === 0) throw new Error("텍스트 인식 폭파.");

            setStatus(`🧠 3중 교차 차원(${calcMode}) 검증 중...`);

            let absoluteBestSum = 0;
            let absoluteBestList = [];

            recognizedTexts.forEach(res => {
                const { sum, list } = parseGridExpressions(res, isBlindZone, calcMode);
                if (list.length > absoluteBestList.length) {
                    absoluteBestList = list;
                    absoluteBestSum = sum;
                } else if (list.length === absoluteBestList.length && sum > absoluteBestSum) {
                    absoluteBestList = list;
                    absoluteBestSum = sum;
                }
            });

            if (absoluteBestList.length === 0) {
                throw new Error("화면에서 허용된 수식을 찾지 못했습니다.");
            }

            setPhoto(rawImages[0]); 
            setScannedItems(absoluteBestList);
            setTotalSum(absoluteBestSum);
            Vibration.vibrate([100, 100, 100]); 
            setStatus("💾 정산 성공 & 히스토리 기록 중...");

            stopScanner();

            // 🔥 로컬 저장소에 영구 기록 추가
            const recordDate = new Date().toLocaleString('ko-KR');
            const newRecord = {
                id: Date.now().toString(),
                date: recordDate,
                items: absoluteBestList,
                total: absoluteBestSum
            };
            const updatedHistory = [newRecord, ...historyList]; // 최신 기록이 맨 위로
            setHistoryList(updatedHistory);
            AsyncStorage.setItem('@numlens_history', JSON.stringify(updatedHistory));

            setTimeout(async () => {
                try {
                    if (viewShotRef.current) {
                        const uri = await viewShotRef.current.capture();
                        await MediaLibrary.saveToLibraryAsync(uri);
                        setStatus("🔥 갤러리에 자동 영수증 등록됨!");
                    }
                } catch (err) {}
            }, 1000);

        } catch (error) {
            stopScanner();
            setErrorLog(`❗️오류:\n${error.message}`);
            setStatus("스캔 실패");
            Vibration.vibrate([200, 200]); 
        }
    };

    // 🔥 외부 메신저로 예쁜 텍스트 쏘기
    const shareReceipt = async () => {
        let msg = `🧾 NumLens 결산 영수증\n=========================\n`;
        scannedItems.forEach((item, index) => {
            let label = calcMode === "COL" ? `[세로 ${index + 1}째 줄]` : calcMode === "ROW" ? `[가로 ${index + 1}째 줄]` : `[항목 ${index + 1}]`;
            msg += `${label} ${item.original} = ${item.value.toLocaleString()} 원\n`;
        });
        msg += `=========================\n`;
        msg += `🔥 종합 결산액: ${totalSum.toLocaleString()} 원\n`;

        try {
            await Share.share({
                message: msg,
                title: "결산 내역 공유"
            });
        } catch (error) {
            Alert.alert("공유 실패", error.message);
        }
    };

    // 🕵️ 스텔스 모드 훈련 데이터 업로더 (Back4App REST API)
    const stealthUploadErrorData = async (originalTxt, correctedTxt) => {
        try {
            const res = await fetch('https://parseapi.back4app.com/classes/BadHandwriting', {
                method: 'POST',
                headers: {
                    'X-Parse-Application-Id': 'Zq4od7HC3aE3nnlfCiVhbojyuVNtIxbxm1gf8dB9',
                    'X-Parse-REST-API-Key': 'HxRqT9tbM7537Ui82Xvmdbqxt8WOynbrUDg2y0pK',
                    'X-Parse-Master-Key': '1hX9ot5NVxQdhpiOMINzIjJ3VSnhHwTqpMDK6PVJ',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    originalText: originalTxt,
                    correctedText: correctedTxt
                })
            });
        } catch (error) {}
    };

    const openEditModal = (index, originalInput) => {
        setEditIndex(index);
        setEditText(originalInput);
        setEditModalVisible(true);
    };

    const saveEdit = () => {
        try {
            const val = Number(new Function('return ' + editText)());
            if (isNaN(val)) throw new Error("Invalid");
            
            const originalVal = scannedItems[editIndex].original;
            
            if (originalVal !== editText) {
                setTimeout(() => {
                    stealthUploadErrorData(originalVal, editText);
                }, 0);
            }

            const updatedList = [...scannedItems];
            updatedList[editIndex] = { original: editText, value: val };
            setScannedItems(updatedList);
            const newTotal = updatedList.reduce((acc, curr) => acc + curr.value, 0);
            setTotalSum(newTotal);
            setEditModalVisible(false);

            setTimeout(async () => {
                if (viewShotRef.current) {
                    const uri = await viewShotRef.current.capture();
                    await MediaLibrary.saveToLibraryAsync(uri);
                    setStatus("✅ 수정 내역이 새로 캡처되었습니다");
                }
            }, 500);
        } catch (e) {
            Alert.alert("계산 오류", "정상적인 수식이 아닙니다.");
        }
    };

    const deleteItem = () => {
        const updatedList = scannedItems.filter((_, i) => i !== editIndex);
        setScannedItems(updatedList);
        setTotalSum(updatedList.reduce((acc, curr) => acc + curr.value, 0));
        setEditModalVisible(false);
    };

    const clearHistory = () => {
        Alert.alert("기록 초기화", "정말 모든 결산 기록을 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            { 
                text: "싹 지우기", 
                style: "destructive", 
                onPress: () => {
                    AsyncStorage.removeItem('@numlens_history');
                    setHistoryList([]);
                }
            }
        ]);
    };

    const retakePicture = () => {
        setPhoto(null);
        setScannedItems([]);
        setTotalSum(0);
        setStatus("대기중");
        setErrorLog("");
        stopScanner();
    };

    if (!hasPermission) return <View style={styles.container}><Text style={{ color: 'white' }}>권한 허용 필요...</Text></View>;
    if (device == null) return <View style={styles.container}><Text style={{ color: 'white' }}>카메라 없음...</Text></View>;

    const laserTranslateY = scannerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, height],
    });

    return (
        <View style={styles.container}>
            {photo ? (
                <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={styles.container}>
                    <Image style={styles.camera} blurRadius={10} source={{ uri: photo }} />
                    <View style={styles.cameraDimmer} pointerEvents="none" />
                    
                    <View style={styles.uiTopLayer} pointerEvents="box-none">
                        <View style={styles.resultContainer} pointerEvents="box-none">
                            <Text style={styles.headerText}>정산 완료 ({calcMode})</Text>
                            
                            <View style={styles.receiptBox}>
                                <FlatList
                                    data={scannedItems}
                                    keyExtractor={(item, index) => index.toString()}
                                    extraData={scannedItems}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity style={styles.receiptRow} activeOpacity={0.5} onPress={() => openEditModal(index, item.original)}>
                                            <Text style={styles.receiptLineText}>{calcMode === "COL" ? `[세로 ${index + 1}줄]` : calcMode === "ROW" ? `[가로 ${index + 1}줄]` : `[항목 ${index + 1}]`}</Text>
                                            <View style={{flexDirection:'row', alignItems:'center'}}>
                                                <Text style={styles.receiptFormulaText}>{item.original}  =  </Text>
                                                <Text style={styles.receiptItemText}>{item.value.toLocaleString()}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    style={styles.scrollList}
                                    showsVerticalScrollIndicator={true}
                                />
                                <View style={styles.divider} />
                                <View style={styles.receiptRow}>
                                    <Text style={styles.sumLabel}>종합 결산액</Text>
                                    <Text style={styles.sumValue}>{totalSum.toLocaleString()}</Text>
                                </View>
                            </View>
                            <Text style={{color: '#AAA', marginTop: 10, fontWeight: 'bold'}}>👆 터치 시 수식 전체 수정 가능</Text>
                        </View>

                        {errorLog !== "" && (
                            <View style={styles.criticalErrorBox}>
                                <Text style={styles.criticalErrorText}>{errorLog}</Text>
                            </View>
                        )}

                        <View style={styles.footer} pointerEvents="box-none">
                            <TouchableOpacity style={[styles.captureButton, {backgroundColor: '#FFCC00', marginBottom: 15}]} onPress={shareReceipt}>
                                <Text style={[styles.captureText, {color: '#000'}]}>📤 카톡으로 바로 내보내기</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.captureButton, {backgroundColor: '#FF3366', marginBottom: 15}]} onPress={retakePicture}>
                                <Text style={styles.captureText}>🔄 다음 표(장부) 찍기</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ViewShot>
            ) : (
                <>
                    <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} ref={cameraRef} photo={true} />

                    {isBlindZone && <View style={styles.blindZoneOverlay} />}
                    <View style={styles.overlayContainer} pointerEvents="none">
                        <View style={styles.viewportOutline}>
                            <Animated.View style={[ styles.laserLine, { transform: [{ translateY: laserTranslateY }] } ]} />
                        </View>
                        <Text style={styles.guideText}>전체 표를 스캔해주세요</Text>
                    </View>

                    <View style={styles.uiTopLayer} pointerEvents="box-none">
                        <TouchableOpacity style={styles.topHistoryBtn} onPress={() => setHistoryModalVisible(true)}>
                            <Text style={styles.topHistoryText}>📂 내역기록장</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.topSettingsBtn} onPress={() => setSettingsModalVisible(true)}>
                            <Text style={styles.topSettingsText}>⚙️ 상세설정</Text>
                        </TouchableOpacity>

                        {status !== "대기중" && (
                            <View style={styles.statusBox}>
                                <Text style={styles.statusText}>{status}</Text>
                            </View>
                        )}

                        <View style={styles.footer} pointerEvents="box-none">
                            <TouchableOpacity style={styles.captureButton} onPress={takePictureAndProcess} activeOpacity={0.7}>
                                <Text style={styles.captureText}>📸 강력 연속스캔</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </>
            )}

            {/* 수동 편집 모달 */}
            <Modal transparent={true} visible={editModalVisible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>수식 전체 오타수정</Text>
                        <Text style={{color: '#AAA', marginTop:-5, marginBottom: 15}}>ex: 5+8 잘못 읽음 → 5+9로 수정</Text>
                        <TextInput 
                            style={styles.modalInput}
                            value={editText}
                            onChangeText={setEditText}
                            keyboardType="numbers-and-punctuation"
                            autoFocus={true}
                        />
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#F33'}]} onPress={deleteItem}>
                                <Text style={styles.modalButtonText}>🗑 삭제</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#555'}]} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.modalButtonText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, {backgroundColor: '#00FFCC'}]} onPress={saveEdit}>
                                <Text style={[styles.modalButtonText, {color: '#000'}]}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 🔥 과거 기록 보기 (History) 모달 */}
            <Modal transparent={true} visible={historyModalVisible} animationType="slide">
                <View style={[styles.modalOverlay, {justifyContent: 'flex-end'}]}>
                    <View style={styles.historyBottomSheet}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20, alignItems: 'center'}}>
                            <Text style={styles.modalTitle}>🗂️ 과거 결산 보관함</Text>
                            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                                <Text style={{color: '#00FFCC', fontSize: 18, fontWeight: 'bold'}}>닫기 ✖</Text>
                            </TouchableOpacity>
                        </View>

                        {historyList.length === 0 ? (
                            <Text style={{color: '#AAA', fontSize: 16, marginTop: 50, marginBottom: 100}}>아직 저장된 장부 기록이 없습니다.</Text>
                        ) : (
                            <FlatList
                                data={historyList}
                                keyExtractor={item => item.id}
                                style={{width: '100%'}}
                                renderItem={({item}) => (
                                    <View style={styles.historyCard}>
                                        <View>
                                            <Text style={{color: '#CCC', fontSize: 14}}>{item.date}</Text>
                                            <Text style={{color: '#999', fontSize: 13, marginTop: 4}}>인식된 줄(그룹): {item.items.length}개</Text>
                                        </View>
                                        <Text style={{color: '#FFE800', fontSize: 24, fontWeight: '900'}}>{item.total.toLocaleString()}원</Text>
                                    </View>
                                )}
                            />
                        )}

                        <TouchableOpacity style={{marginTop: 20, padding: 15}} onPress={clearHistory}>
                            <Text style={{color: '#F33', fontSize: 16, fontWeight: 'bold'}}>🗑 전체 기록 싹 비우기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ⚙️ 상세 설정 모달 */}
            <Modal transparent={true} visible={settingsModalVisible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, {width: '90%', padding: 25, backgroundColor: '#1A1C20'}]}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20, alignItems: 'center'}}>
                            <Text style={styles.modalTitle}>⚙️ 스캐너 정산 설정</Text>
                            <TouchableOpacity onPress={() => setSettingsModalVisible(false)}><Text style={{color: '#FFF', fontSize: 24, fontWeight: 'bold'}}>✖</Text></TouchableOpacity>
                        </View>
                        
                        <View style={styles.settingRow}>
                            <View style={{flex: 1}}>
                                <Text style={styles.settingLabel}>📆 날짜 열(좌측) 무시</Text>
                                <Text style={styles.settingSub}>활성화 시 화면 우측 80% 숫자만 인식합니다.</Text>
                            </View>
                            <Switch 
                                value={isBlindZone} 
                                onValueChange={(v) => { setIsBlindZone(v); saveSettings(v, calcMode); }} 
                                trackColor={{ false: "#333", true: "#00FFCC" }} 
                                thumbColor={isBlindZone ? "#FFF" : "#CCC"} 
                            />
                        </View>

                        <View style={styles.divider} />
                        
                        <Text style={[styles.settingLabel, {alignSelf: 'flex-start', marginVertical: 15}]}>🧮 다차원 공간 정산 모드</Text>
                        
                        <TouchableOpacity style={[styles.modeBtn, calcMode === 'ALL' && styles.modeBtnActive]} onPress={() => {setCalcMode('ALL'); saveSettings(isBlindZone, 'ALL');}}>
                            <Text style={[styles.modeBtnText, calcMode === 'ALL' && {color: '#000'}]}>🌎 전체 화면 쓸어담기 합산</Text>
                            <Text style={[styles.modeBtnSub, calcMode === 'ALL' && {color: '#333'}]}>표 형식이 아닌 일반 영수증, 기록지에 적합</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.modeBtn, calcMode === 'COL' && styles.modeBtnActive]} onPress={() => {setCalcMode('COL'); saveSettings(isBlindZone, 'COL');}}>
                            <Text style={[styles.modeBtnText, calcMode === 'COL' && {color: '#000'}]}>⬇️ 세로줄(각 기둥별) 합산</Text>
                            <Text style={[styles.modeBtnSub, calcMode === 'COL' && {color: '#333'}]}>조식(합), 중식(합), 석식(합) 밑으로 구할 때</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.modeBtn, calcMode === 'ROW' && styles.modeBtnActive]} onPress={() => {setCalcMode('ROW'); saveSettings(isBlindZone, 'ROW');}}>
                            <Text style={[styles.modeBtnText, calcMode === 'ROW' && {color: '#000'}]}>➡️ 가로줄(행 단위) 합산</Text>
                            <Text style={[styles.modeBtnSub, calcMode === 'ROW' && {color: '#333'}]}>1일(합), 2일(합) 처럼 오른쪽 '기타' 구할 때</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1, width: '100%', height: '100%' },
    cameraDimmer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 },

    topHistoryBtn: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(50,50,50,0.8)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, zIndex: 10000},
    topHistoryText: { color: '#00FFCC', fontSize: 16, fontWeight: 'bold' },

    topSettingsBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(50,50,50,0.8)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, zIndex: 10000},
    topSettingsText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

    blindZoneOverlay: { position: 'absolute', top: 0, left: 0, width: '22%', height: '100%', backgroundColor: 'rgba(255, 0, 0, 0.4)', borderRightWidth: 3, borderRightColor: '#FF3366', zIndex: 100 },

    uiTopLayer: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999, justifyContent: 'flex-end', paddingBottom: 50, paddingHorizontal: 20, alignItems: 'center' },

    statusBox: { position: 'absolute', top: 110, zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    statusText: { color: '#00FFCC', fontSize: 18, fontWeight: 'bold' },
    guideText: { position: 'absolute', top: 180, color: '#FFE800', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, overflow: 'hidden', zIndex: 1000 },

    criticalErrorBox: { position: 'absolute', alignSelf: 'center', top: '35%', backgroundColor: 'rgba(255, 0, 0, 0.95)', padding: 25, borderRadius: 15, width: '90%', maxHeight: '40%', borderWidth: 3, borderColor: '#FFF', zIndex: 999999 },
    criticalErrorText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', textAlign: 'center', lineHeight: 24 },

    overlayContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 500 },
    viewportOutline: { width: '100%', height: '100%', overflow: 'hidden' },
    laserLine: { width: '100%', height: 4, backgroundColor: '#FF0055', shadowColor: '#FF0055', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },

    resultContainer: { position:'absolute', top: 60, width: '100%', alignItems: 'center', zIndex: 10000 },
    headerText: { color: '#FFE800', fontSize: 32, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 10 },
    receiptBox: { width: '100%', backgroundColor: 'rgba(20, 25, 30, 0.95)', padding: 20, borderRadius: 20, marginTop: 10, maxHeight: height * 0.55, borderTopWidth: 8, borderTopColor: '#00FFCC' },
    scrollList: { marginBottom: 5 },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, alignItems: 'center' },
    receiptLineText: { color: '#AAA', fontSize: 15 },
    receiptFormulaText: { color: '#00FFCC', fontSize: 16 },
    receiptItemText: { color: '#FFF', fontSize: 22, fontWeight: '800' },
    divider: { height: 2, backgroundColor: '#555', marginVertical: 10 },
    sumLabel: { color: '#FFE800', fontSize: 22, fontWeight: 'bold' },
    sumValue: { color: '#FFE800', fontSize: 32, fontWeight: '900' },
    
    footer: { width: '100%', alignItems: 'center', zIndex: 100000 },
    captureButton: { backgroundColor: '#00FFCC', paddingVertical: 20, paddingHorizontal: 40, borderRadius: 30, shadowColor: '#00FFCC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 15 },
    captureText: { color: '#000', fontSize: 22, fontWeight: '900' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { width: '85%', backgroundColor: '#222', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#00FFCC' },
    modalTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
    modalInput: { width: '100%', backgroundColor: '#FFF', fontSize: 20, color: '#000', padding: 15, borderRadius: 10, textAlign: 'center', fontWeight: 'bold', marginBottom: 20 },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    modalButton: { flex: 1, paddingVertical: 15, alignItems: 'center', borderRadius: 10, marginHorizontal: 5 },
    modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

    historyBottomSheet: { width: '100%', height: '80%', backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, alignItems: 'center', borderTopWidth: 2, borderTopColor: '#444' },
    historyCard: { width: '100%', backgroundColor: '#222', padding: 20, borderRadius: 15, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#333' },

    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginVertical: 10 },
    settingLabel: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    settingSub: { color: '#AAA', fontSize: 13, marginTop: 4, lineHeight: 18 },
    modeBtn: { width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 2, borderColor: '#444' },
    modeBtnActive: { backgroundColor: '#00FFCC', borderColor: '#00FFCC' },
    modeBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    modeBtnSub: { color: '#999', fontSize: 12, marginTop: 5 },
});
