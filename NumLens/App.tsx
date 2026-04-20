import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, ScrollView, Animated, Easing, Vibration, Dimensions, FlatList } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';

const { width, height } = Dimensions.get('window');

// 초점 박스 크기
const CROP_SIZE = width * 0.8;

export default function App() {
    const { hasPermission, requestPermission } = useCameraPermission();
    const [mediaPermissionResponse, requestMediaPermission] = MediaLibrary.usePermissions();
    const device = useCameraDevice('back');

    const cameraRef = useRef(null);
    const viewShotRef = useRef(null);

    const [photo, setPhoto] = useState(null);
    const [scannedNumbers, setScannedNumbers] = useState([]);
    const [totalSum, setTotalSum] = useState(0);
    const [status, setStatus] = useState("대기중");
    const [errorLog, setErrorLog] = useState("");
    
    // 애니메이션 제어 변수
    const scannerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!hasPermission) requestPermission();
    }, [hasPermission]);

    if (!hasPermission) return <View style={styles.container}><Text style={{ color: 'white' }}>카메라 권한 설정 중...</Text></View>;
    if (device == null) return <View style={styles.container}><Text style={{ color: 'white' }}>카메라를 찾을 수 없습니다.</Text></View>;

    const startScanner = () => {
        scannerAnim.setValue(0);
        Animated.loop(
            Animated.sequence([
                Animated.timing(scannerAnim, {
                    toValue: 1,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(scannerAnim, {
                    toValue: 0,
                    duration: 1500,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ])
        ).start();
    };

    const stopScanner = () => {
        scannerAnim.stopAnimation();
    };

    const parseNumbersFromText = (rawText) => {
        // 문단을 줄 단위로 분리
        const lines = rawText.split('\n');
        const numbers = [];
        
        lines.forEach(line => {
            // 영어, 한글, 특수문자 제거 후 쉼표 처리, 숫자만 추출
            const cleanStr = line.replace(/[^0-9]/g, '');
            if (cleanStr.length > 0) {
                const num = parseInt(cleanStr, 10);
                // 비정상적으로 큰 쓰레기값이나 0은 무시할 수 있음 (옵션)
                if (num > 0) {
                    numbers.push(num);
                }
            }
        });
        
        return numbers;
    };

    const takePictureAndProcess = async () => {
        Vibration.vibrate(50); // 촬영 햅틱 피드백
        setErrorLog("");
        startScanner(); // 레이저 애니메이션 시작

        if (!cameraRef.current) {
            setErrorLog("카메라 렌즈를 찾을 수 없습니다.");
            stopScanner();
            return;
        }

        try {
            setStatus("1. 스캔 시작...");
            if (!mediaPermissionResponse?.granted) {
                const permission = await requestMediaPermission();
                if (!permission.granted) {
                    Alert.alert("권한 거부", "갤러리 저장 권한이 거부되었습니다.");
                    stopScanner();
                    return;
                }
            }

            setStatus("2. 찰칵! 📸...");
            const file = await cameraRef.current.takePhoto({ qualityPrioritization: 'speed' });
            const imageUri = file.path.startsWith('file://') ? file.path : `file://${file.path}`;
            setPhoto(imageUri); // 사진 넘기기

            setStatus("3. AI 숫자 분석 중 🧠...");
            const result = await TextRecognition.recognize(imageUri);
            
            setStatus("4. 계산 중 🧮...");
            const numbers = parseNumbersFromText(result.text);
            
            if (numbers.length === 0) {
                Alert.alert("인식 실패", "화면에 인식된 숫자가 없습니다.");
                setErrorLog("숫자를 찾지 못했습니다. 가이드라인 안에 숫자를 맞춰주세요.");
            } else {
                setScannedNumbers(numbers);
                const sum = numbers.reduce((acc, curr) => acc + curr, 0);
                setTotalSum(sum);
                Vibration.vibrate(100); // 성공 햅틱
            }
            
            setStatus("5. 갤러리 저장 대기...");
            stopScanner();
            
            // 결과창 레이아웃이 렌더링될 시간을 벌고 갤러리 캡처 수행
            setTimeout(saveToGallery, 1500);

        } catch (error) {
            stopScanner();
            Alert.alert("🚨 에러 발생!", `원인: ${String(error)}`);
            setErrorLog(`[에러] ${String(error)}`);
            setStatus("대기중");
        }
    };

    const saveToGallery = async () => {
        if (viewShotRef.current) {
            try {
                const uri = await viewShotRef.current.capture();
                await MediaLibrary.saveToLibraryAsync(uri);
                Alert.alert("저장 성공!", "계산 결과가 갤러리에 저장되었습니다. 📸");
                setStatus("완료!");
            } catch (err) {
                Alert.alert("저장 에러", String(err));
                setErrorLog(`[저장 중 에러] ${String(err)}`);
            }
        }
    };

    const retakePicture = () => {
        setPhoto(null);
        setScannedNumbers([]);
        setTotalSum(0);
        setStatus("대기중");
        setErrorLog("");
        stopScanner();
    };

    const laserTranslateY = scannerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, CROP_SIZE - 2],
    });

    // -----------------------------------------
    // 결과 확인 화면 (사진 + 결과 리스트 오버레이)
    // -----------------------------------------
    if (photo) {
        return (
            <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={styles.container}>
                <Image style={styles.camera} source={{ uri: photo }} />
                
                <View style={styles.uiTopLayer} pointerEvents="box-none">
                    <View style={styles.resultContainer}>
                        <Text style={styles.headerText}>계산 결과</Text>
                        
                        <View style={styles.receiptBox}>
                            <FlatList
                                data={scannedNumbers}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item, index }) => (
                                    <View style={styles.receiptRow}>
                                        <Text style={styles.receiptLineText}>항목 {index + 1}</Text>
                                        <Text style={styles.receiptItemText}>+ {item.toLocaleString()} 원</Text>
                                    </View>
                                )}
                                style={styles.scrollList}
                            />
                            <View style={styles.divider} />
                            <View style={styles.receiptRow}>
                                <Text style={styles.sumLabel}>총합산 (Total)</Text>
                                <Text style={styles.sumValue}>{totalSum.toLocaleString()} 원</Text>
                            </View>
                        </View>
                    </View>

                    {errorLog !== "" && (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{errorLog}</Text>
                        </View>
                    )}

                    <View style={styles.footer} pointerEvents="box-none">
                        <TouchableOpacity style={styles.captureButton} onPress={retakePicture}>
                            <Text style={styles.captureText}>🔄 다시 스캔하기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ViewShot>
        );
    }

    // -----------------------------------------
    // 카메라 촬영 화면 
    // -----------------------------------------
    return (
        <View style={styles.container}>
            <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} ref={cameraRef} photo={true} />

            {/* 카메라 오버레이: 가이드라인 + 레이저 애니메이션 UI */}
            <View style={styles.overlayContainer} pointerEvents="none">
                <View style={styles.viewportOutline}>
                    <Animated.View style={[ styles.laserLine, { transform: [{ translateY: laserTranslateY }] } ]} />
                </View>
                <Text style={styles.guideText}>이 테두리 안에 숫자를 맞춰주세요</Text>
            </View>

            <View style={styles.uiTopLayer} pointerEvents="box-none">
                <Text style={styles.appNameText}>NumLens</Text>

                {status !== "대기중" && <Text style={styles.statusText}>{status}</Text>}

                {errorLog !== "" && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{errorLog}</Text>
                    </View>
                )}

                {/* 하단 버튼 */}
                <View style={styles.footer} pointerEvents="box-none">
                    <TouchableOpacity style={styles.captureButton} onPress={takePictureAndProcess} activeOpacity={0.7}>
                        <Text style={styles.captureText}>📸 영수증 스캔</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1, width: '100%', height: '100%' },

    // Top Layer for UI Controls
    uiTopLayer: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 50, paddingHorizontal: 20, alignItems: 'center' },

    appNameText: { color: '#00FFCC', fontSize: 30, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,1)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 10 },
    headerText: { color: '#FFE800', fontSize: 26, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 10 },
    
    statusText: { color: '#FFF', fontSize: 18, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, overflow: 'hidden', fontWeight: 'bold', marginTop: 15 },
    guideText: { color: '#00FFCC', fontSize: 16, fontWeight: 'bold', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 8, overflow: 'hidden' },

    // Scanner Overlay & Animation
    overlayContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 500 },
    viewportOutline: { width: CROP_SIZE, height: CROP_SIZE, borderWidth: 3, borderColor: '#00FFCC', borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden' },
    laserLine: { width: '100%', height: 2, backgroundColor: '#FF0055', shadowColor: '#FF0055', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 5 },

    // Result Receipt Box UI
    resultContainer: { flex: 1, width: '100%', alignItems: 'center', marginTop: 20 },
    receiptBox: { width: '100%', backgroundColor: 'rgba(20, 25, 30, 0.9)', padding: 20, borderRadius: 20, marginTop: 20, maxHeight: height * 0.5, borderLeftWidth: 5, borderLeftColor: '#00FFCC' },
    scrollList: { marginBottom: 15 },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    receiptLineText: { color: '#AAA', fontSize: 16 },
    receiptItemText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#444', marginVertical: 10 },
    sumLabel: { color: '#00FFCC', fontSize: 20, fontWeight: 'bold' },
    sumValue: { color: '#00FFCC', fontSize: 26, fontWeight: '900' },

    errorBox: { backgroundColor: 'rgba(255,50,50,0.9)', padding: 15, borderRadius: 10, marginBottom: 20, width: '90%' },
    errorText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    
    footer: { alignItems: 'center', width: '100%', zIndex: 10000, marginBottom: 20 },
    captureButton: { backgroundColor: '#00FFCC', paddingVertical: 20, paddingHorizontal: 50, borderRadius: 30, shadowColor: '#00FFCC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 10, zIndex: 10000, elevation: 10 },
    captureText: { color: '#000', fontSize: 22, fontWeight: 'bold' }
});