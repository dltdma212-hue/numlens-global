import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, Animated, Easing, Vibration, Dimensions, FlatList, Modal, TextInput, Share, Switch, ScrollView } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function OCRScreen() {
    const { hasPermission, requestPermission } = useCameraPermission();
    const [mediaPermissionResponse, requestMediaPermission] = MediaLibrary.usePermissions();
    const device = useCameraDevice('back');

    const cameraRef = useRef(null);
    const viewShotRef = useRef(null);

    const [photo, setPhoto] = useState(null);
    // gridData: 2D array [row][col] = { original: string, value: number }
    const [gridData, setGridData] = useState([]);
    const [totalSum, setTotalSum] = useState(0);

    const [status, setStatus] = useState("대기중");
    const [errorLog, setErrorLog] = useState("");

    const scannerAnim = useRef(new Animated.Value(0)).current;

    // 모달 상태
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editCell, setEditCell] = useState({ r: 0, c: 0 });
    const [editText, setEditText] = useState("");

    const [historyList, setHistoryList] = useState([]);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);

    // 설정
    const [isBlindZone, setIsBlindZone] = useState(false);
    const [calcMode, setCalcMode] = useState("ROW"); // ROW: 가로합, COL: 세로합
    const [gridRows, setGridRows] = useState(31);
    const [gridCols, setGridCols] = useState(5);
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);

    useEffect(() => {
        if (!hasPermission) requestPermission();
        loadHistory();
        loadSettings();
    }, [hasPermission]);

    const loadSettings = async () => {
        try {
            const b = await AsyncStorage.getItem('@numlens_blind');
            if (b !== null) setIsBlindZone(b === 'true');
            const m = await AsyncStorage.getItem('@numlens_calcmode');
            if (m !== null) setCalcMode(m);
            const r = await AsyncStorage.getItem('@numlens_gridrows');
            if (r !== null) setGridRows(Number(r));
            const c = await AsyncStorage.getItem('@numlens_gridcols');
            if (c !== null) setGridCols(Number(c));
        } catch (e) {}
    };

    const saveSettings = (blind, mode, rows, cols) => {
        AsyncStorage.setItem('@numlens_blind', String(blind));
        AsyncStorage.setItem('@numlens_calcmode', mode);
        AsyncStorage.setItem('@numlens_gridrows', String(rows));
        AsyncStorage.setItem('@numlens_gridcols', String(cols));
    };

    const loadHistory = async () => {
        try {
            const data = await AsyncStorage.getItem('@numlens_history');
            if (data !== null) setHistoryList(JSON.parse(data));
        } catch (e) {}
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

    const stopScanner = () => scannerAnim.stopAnimation();

    // ═══════════════════════════════════════════════════
    // 📊 범용 격자(Generic Grid) 매핑 엔진
    // OCR 결과를 rows×cols 2D 격자 셀에 배치
    // ═══════════════════════════════════════════════════
    const parseToGrid = (result, blind, imgW, imgH, rows, cols) => {
        if (!result || !result.blocks) return null;

        // 빈 2D 셀 맵 초기화
        const cellMap = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ({ original: '', value: 0 }))
        );

        const iW = imgW || width;
        const iH = imgH || height;

        result.blocks.forEach(b => {
            if (!b.lines) return;
            b.lines.forEach(l => {
                if (!l.frame) return;

                // 셀 인덱스 계산 (비율 기반)
                let colIdx = Math.floor((l.frame.x / iW) * cols);
                let rowIdx = Math.floor((l.frame.y / iH) * rows);

                colIdx = Math.max(0, Math.min(cols - 1, colIdx));
                rowIdx = Math.max(0, Math.min(rows - 1, rowIdx));

                // 블라인드 존: 0번 열(날짜 열) 무시
                if (blind && colIdx === 0) return;

                // 텍스트 파싱
                let cleanText = l.text.replace(/x/gi, '*').replace(/×/g, '*').replace(/÷/g, '/');
                cleanText = cleanText.replace(/[^0-9+\-*/.]/g, ' ');
                const parts = cleanText.split(' ').filter(p => p.length > 0);

                parts.forEach(p => {
                    const mathStr = p.replace(/^[+\-*/.]+|[+\-*/.]+$/g, '');
                    if (!mathStr) return;
                    try {
                        const val = Number(new Function('return ' + mathStr)());
                        if (!isNaN(val) && val > 0) {
                            const cell = cellMap[rowIdx][colIdx];
                            cell.original = cell.original ? cell.original + '+' + mathStr : mathStr;
                            cell.value += val;
                        }
                    } catch (e) {}
                });
            });
        });

        return cellMap;
    };

    // 격자 데이터에서 합계를 계산하고 보기 좋은 result 반환
    const summarizeGrid = (cellMap, mode, rows, cols) => {
        let total = 0;
        const list = [];

        if (mode === 'COL') {
            // 세로 기둥별 합산
            for (let c = 0; c < cols; c++) {
                let colSum = 0;
                let colLabel = '';
                for (let r = 0; r < rows; r++) {
                    if (cellMap[r][c].value > 0) {
                        colSum += cellMap[r][c].value;
                        colLabel = colLabel ? colLabel + '+' + cellMap[r][c].original : cellMap[r][c].original;
                    }
                }
                if (colSum > 0) {
                    list.push({ col: c, original: colLabel, value: colSum });
                    total += colSum;
                }
            }
        } else {
            // 가로 행별 합산 (ROW + ALL)
            for (let r = 0; r < rows; r++) {
                let rowSum = 0;
                let rowLabel = '';
                for (let c = 0; c < cols; c++) {
                    if (cellMap[r][c].value > 0) {
                        rowSum += cellMap[r][c].value;
                        rowLabel = rowLabel ? rowLabel + '+' + cellMap[r][c].original : cellMap[r][c].original;
                    }
                }
                if (rowSum > 0) {
                    list.push({ row: r, original: rowLabel, value: rowSum });
                    total += rowSum;
                }
            }
        }

        return { total, list };
    };

    // ═══════════════════════════════════════════════════
    // 📸 촬영 및 처리
    // ═══════════════════════════════════════════════════
    const takePictureAndProcess = async () => {
        Vibration.vibrate(50);
        setErrorLog("");
        setPhoto(null);
        setGridData([]);
        setStatus("연속 스캔 중...📸");
        startScanner();

        try {
            if (!cameraRef.current) throw new Error("카메라 렌즈 불안정.");
            if (!mediaPermissionResponse?.granted) {
                const perm = await requestMediaPermission();
                if (!perm.granted) throw new Error("사진첩 저장 권한 필요.");
            }

            const rawImages = [];
            const tries = [];

            for (let i = 0; i < 3; i++) {
                const file = await cameraRef.current.takePhoto({ qualityPrioritization: 'speed' });
                const uri = file.path.startsWith('file://') ? file.path : `file://${file.path}`;
                if (i === 1) rawImages.push(uri);

                const result = await TextRecognition.recognize(uri);
                if (result) tries.push({ result, iW: file.width, iH: file.height });
                await new Promise(r => setTimeout(r, 150));
            }

            if (tries.length === 0) throw new Error("텍스트 인식 실패.");

            setStatus(`📐 격자(${gridRows}×${gridCols}) 표준화 중...`);

            // 3번 중 가장 많은 숫자를 인식한 결과 선택
            let bestGrid = null;
            let bestCount = -1;

            tries.forEach(({ result, iW, iH }) => {
                const cellMap = parseToGrid(result, isBlindZone, iW, iH, gridRows, gridCols);
                if (!cellMap) return;
                let count = 0;
                cellMap.forEach(row => row.forEach(cell => { if (cell.value > 0) count++; }));
                if (count > bestCount) { bestCount = count; bestGrid = cellMap; }
            });

            if (!bestGrid || bestCount === 0) throw new Error("화면에서 숫자를 찾지 못했습니다.");

            const { total, list } = summarizeGrid(bestGrid, calcMode, gridRows, gridCols);

            setPhoto(rawImages[0]);
            setGridData(bestGrid);
            setTotalSum(total);
            Vibration.vibrate([100, 100, 100]);
            setStatus("✅ 정산 완료!");
            stopScanner();

            // 이력 저장
            const recordDate = new Date().toLocaleString('ko-KR');
            const newRecord = { id: Date.now().toString(), date: recordDate, gridRows, gridCols, total };
            const updated = [newRecord, ...historyList];
            setHistoryList(updated);
            AsyncStorage.setItem('@numlens_history', JSON.stringify(updated));

            setTimeout(async () => {
                try {
                    if (viewShotRef.current) {
                        const captUri = await viewShotRef.current.capture();
                        await MediaLibrary.saveToLibraryAsync(captUri);
                        setStatus("🔥 갤러리에 자동 저장됨!");
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

    // ═══════════════════════════════════════════════════
    // 셀 수동 편집
    // ═══════════════════════════════════════════════════
    const openCellEdit = (r, c) => {
        setEditCell({ r, c });
        setEditText(gridData[r][c].original);
        setEditModalVisible(true);
    };

    const saveCellEdit = () => {
        try {
            const val = Number(new Function('return ' + (editText || '0'))());
            if (isNaN(val)) throw new Error();
            const newGrid = gridData.map(row => [...row]);
            newGrid[editCell.r][editCell.c] = { original: editText, value: val };
            setGridData(newGrid);
            // 합계 재계산
            const { total } = summarizeGrid(newGrid, calcMode, gridRows, gridCols);
            setTotalSum(total);
            setEditModalVisible(false);
        } catch (e) {
            Alert.alert("오류", "올바른 숫자나 수식을 입력하세요.");
        }
    };

    const clearHistory = () => {
        Alert.alert("기록 초기화", "모든 기록을 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: () => { AsyncStorage.removeItem('@numlens_history'); setHistoryList([]); } }
        ]);
    };

    const retakePicture = () => {
        setPhoto(null);
        setGridData([]);
        setTotalSum(0);
        setStatus("대기중");
        setErrorLog("");
        stopScanner();
    };

    const shareReceipt = async () => {
        const { list } = summarizeGrid(gridData, calcMode, gridRows, gridCols);
        let msg = `🧾 NumLens 결산 영수증\n=========================\n`;
        list.forEach((item, i) => {
            const label = calcMode === 'COL' ? `[세로 ${(item.col ?? i) + 1}열]` : `[가로 ${(item.row ?? i) + 1}줄]`;
            msg += `${label} ${item.original} = ${item.value.toLocaleString()} 원\n`;
        });
        msg += `=========================\n🔥 종합 결산액: ${totalSum.toLocaleString()} 원\n`;
        try { await Share.share({ message: msg }); } catch (e) {}
    };

    if (!hasPermission) return <View style={styles.container}><Text style={{ color: 'white' }}>권한 허용 필요...</Text></View>;
    if (device == null) return <View style={styles.container}><Text style={{ color: 'white' }}>카메라 없음...</Text></View>;

    const laserTranslateY = scannerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, height] });

    // ── 카메라 격자 가이드 오버레이 ──
    const renderGridOverlay = () => {
        const lines = [];
        for (let r = 1; r < gridRows; r++) {
            lines.push(<View key={`r${r}`} style={[styles.gridLineRow, { top: `${(r / gridRows) * 100}%` }]} />);
        }
        for (let c = 1; c < gridCols; c++) {
            lines.push(<View key={`c${c}`} style={[styles.gridLineCol, { left: `${(c / gridCols) * 100}%` }]} />);
        }
        // 격자 외곽선
        lines.push(<View key="border" style={styles.gridBorder} />);
        return <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>{lines}</View>;
    };

    // ── 결과 엑셀 표 렌더 ──
    const renderResultTable = () => {
        if (!gridData || gridData.length === 0) return null;

        // 각 열 너비 계산
        const colW = Math.max(60, (width - 40 - 36) / gridCols);
        const { list } = summarizeGrid(gridData, calcMode, gridRows, gridCols);

        // 합계 요약을 퀵 맵으로 구성
        const colSums = Array(gridCols).fill(0);
        const rowSums = Array(gridRows).fill(0);
        gridData.forEach((row, r) => row.forEach((cell, c) => {
            colSums[c] += cell.value;
            rowSums[r] += cell.value;
        }));

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {/* 표 */}
                    <View style={{ flexDirection: 'column' }}>
                        {/* 헤더 행 (열 번호) */}
                        <View style={styles.tableRow}>
                            <View style={[styles.tableHeaderCell, { width: 36 }]}>
                                <Text style={styles.tableHeaderText}>#</Text>
                            </View>
                            {Array.from({ length: gridCols }, (_, c) => (
                                <View key={c} style={[styles.tableHeaderCell, { width: colW }]}>
                                    <Text style={styles.tableHeaderText}>{String.fromCharCode(65 + c)}</Text>
                                </View>
                            ))}
                            <View style={[styles.tableHeaderCell, { width: colW, backgroundColor: '#1a3a2a' }]}>
                                <Text style={[styles.tableHeaderText, { color: '#00FFCC' }]}>합계</Text>
                            </View>
                        </View>

                        {/* 데이터 행 */}
                        {gridData.map((row, r) => {
                            const hasData = row.some(cell => cell.value > 0);
                            return (
                                <View key={r} style={[styles.tableRow, !hasData && { opacity: 0.3 }]}>
                                    {/* 행 번호 */}
                                    <View style={[styles.tableIndexCell, { width: 36 }]}>
                                        <Text style={styles.tableIndexText}>{r + 1}</Text>
                                    </View>
                                    {/* 데이터 셀 */}
                                    {row.map((cell, c) => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.tableDataCell, { width: colW }, cell.value > 0 && styles.tableDataCellActive]}
                                            onPress={() => openCellEdit(r, c)}
                                        >
                                            <Text style={[styles.tableDataText, cell.value > 0 && { color: '#FFF', fontWeight: '700' }]}>
                                                {cell.value > 0 ? cell.value.toLocaleString() : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    {/* 행 합계 */}
                                    <View style={[styles.tableDataCell, { width: colW, backgroundColor: '#1a2a1a', borderLeftWidth: 2, borderLeftColor: '#00FFCC' }]}>
                                        <Text style={[styles.tableDataText, { color: '#00FFCC', fontWeight: '800' }]}>
                                            {rowSums[r] > 0 ? rowSums[r].toLocaleString() : ''}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}

                        {/* 합계 행 */}
                        <View style={[styles.tableRow, { borderTopWidth: 2, borderTopColor: '#00FFCC' }]}>
                            <View style={[styles.tableIndexCell, { width: 36, backgroundColor: '#1a3a2a' }]}>
                                <Text style={[styles.tableIndexText, { color: '#00FFCC' }]}>계</Text>
                            </View>
                            {colSums.map((s, c) => (
                                <View key={c} style={[styles.tableDataCell, { width: colW, backgroundColor: '#1a3a2a' }]}>
                                    <Text style={[styles.tableDataText, { color: '#00FFCC', fontWeight: '800' }]}>
                                        {s > 0 ? s.toLocaleString() : ''}
                                    </Text>
                                </View>
                            ))}
                            <View style={[styles.tableDataCell, { width: colW, backgroundColor: '#0d2a1a' }]}>
                                <Text style={[styles.tableDataText, { color: '#FFE800', fontWeight: '900', fontSize: 14 }]}>
                                    {totalSum.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </ScrollView>
        );
    };

    return (
        <View style={styles.container}>
            {photo ? (
                // ── 결과 화면 ──
                <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }} style={styles.container}>
                    <Image style={StyleSheet.absoluteFill} blurRadius={8} source={{ uri: photo }} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)' }]} />

                    <View style={styles.resultScreen}>
                        {/* 헤더 */}
                        <View style={styles.resultHeader}>
                            <View>
                                <Text style={styles.headerText}>📊 정산 완료</Text>
                                <Text style={styles.headerSub}>{`격자: ${gridRows}행 × ${gridCols}열  |  모드: ${calcMode}`}</Text>
                            </View>
                            <View style={styles.totalBadge}>
                                <Text style={styles.totalBadgeLabel}>총합</Text>
                                <Text style={styles.totalBadgeValue}>{totalSum.toLocaleString()}</Text>
                            </View>
                        </View>

                        {/* 엑셀 표 */}
                        <View style={styles.tableContainer}>
                            {renderResultTable()}
                        </View>

                        <Text style={{ color: '#666', fontSize: 12, textAlign: 'center', marginTop: 6 }}>
                            👆 셀 터치 시 값 수정 가능
                        </Text>

                        {errorLog !== "" && (
                            <View style={styles.criticalErrorBox}>
                                <Text style={styles.criticalErrorText}>{errorLog}</Text>
                            </View>
                        )}

                        {/* 버튼 */}
                        <View style={styles.resultFooter}>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFCC00' }]} onPress={shareReceipt}>
                                <Text style={[styles.actionBtnText, { color: '#000' }]}>📤 카톡으로 내보내기</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF3366' }]} onPress={retakePicture}>
                                <Text style={styles.actionBtnText}>🔄 다음 표 찍기</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ViewShot>
            ) : (
                // ── 카메라 화면 ──
                <>
                    <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} ref={cameraRef} photo={true} />

                    {/* 격자 가이드 오버레이 */}
                    {renderGridOverlay()}

                    {/* 날짜 열 블라인드 존 */}
                    {isBlindZone && (
                        <View style={[styles.blindZoneOverlay, { width: `${100 / gridCols}%` }]} />
                    )}

                    {/* 레이저 스캔 라인 */}
                    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
                        <Animated.View style={[styles.laserLine, { transform: [{ translateY: laserTranslateY }] }]} />
                    </View>

                    {/* 격자 규격 표시 배지 */}
                    <View style={styles.gridBadge}>
                        <Text style={styles.gridBadgeText}>{`${gridRows} × ${gridCols}`}</Text>
                    </View>

                    {/* 상단 버튼들 */}
                    <TouchableOpacity style={styles.topHistoryBtn} onPress={() => setHistoryModalVisible(true)}>
                        <Text style={styles.topHistoryText}>📂 내역</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topSettingsBtn} onPress={() => setSettingsModalVisible(true)}>
                        <Text style={styles.topSettingsText}>⚙️ 설정</Text>
                    </TouchableOpacity>

                    {status !== "대기중" && (
                        <View style={styles.statusBox}>
                            <Text style={styles.statusText}>{status}</Text>
                        </View>
                    )}

                    {/* 가이드 텍스트 */}
                    <View style={styles.guideBox}>
                        <Text style={styles.guideText}>📋 격자에 표를 맞추고 촬영하세요</Text>
                    </View>

                    {/* 촬영 버튼 */}
                    <View style={styles.captureArea}>
                        <TouchableOpacity style={styles.captureButton} onPress={takePictureAndProcess} activeOpacity={0.7}>
                            <Text style={styles.captureText}>📸 강력 연속스캔</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* 셀 수동 편집 모달 */}
            <Modal transparent={true} visible={editModalVisible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>셀 값 수정</Text>
                        <Text style={{ color: '#AAA', marginBottom: 15 }}>
                            {`[${editCell.r + 1}행, ${String.fromCharCode(65 + editCell.c)}열]`}
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            value={editText}
                            onChangeText={setEditText}
                            keyboardType="numbers-and-punctuation"
                            autoFocus={true}
                            placeholder="숫자 또는 수식 입력"
                        />
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#F33' }]}
                                onPress={() => {
                                    const newGrid = gridData.map(row => [...row]);
                                    newGrid[editCell.r][editCell.c] = { original: '', value: 0 };
                                    setGridData(newGrid);
                                    const { total } = summarizeGrid(newGrid, calcMode, gridRows, gridCols);
                                    setTotalSum(total);
                                    setEditModalVisible(false);
                                }}>
                                <Text style={styles.modalButtonText}>🗑 삭제</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#555' }]} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.modalButtonText}>취소</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#00FFCC' }]} onPress={saveCellEdit}>
                                <Text style={[styles.modalButtonText, { color: '#000' }]}>저장</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 기록 보관함 모달 */}
            <Modal transparent={true} visible={historyModalVisible} animationType="slide">
                <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                    <View style={styles.historyBottomSheet}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20, alignItems: 'center' }}>
                            <Text style={styles.modalTitle}>🗂️ 과거 결산 보관함</Text>
                            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                                <Text style={{ color: '#00FFCC', fontSize: 18, fontWeight: 'bold' }}>닫기 ✖</Text>
                            </TouchableOpacity>
                        </View>
                        {historyList.length === 0 ? (
                            <Text style={{ color: '#AAA', fontSize: 16, marginTop: 50 }}>아직 저장된 기록이 없습니다.</Text>
                        ) : (
                            <FlatList
                                data={historyList}
                                keyExtractor={item => item.id}
                                style={{ width: '100%' }}
                                renderItem={({ item }) => (
                                    <View style={styles.historyCard}>
                                        <View>
                                            <Text style={{ color: '#CCC', fontSize: 14 }}>{item.date}</Text>
                                            <Text style={{ color: '#999', fontSize: 13, marginTop: 4 }}>
                                                {`격자: ${item.gridRows ?? '?'}행 × ${item.gridCols ?? '?'}열`}
                                            </Text>
                                        </View>
                                        <Text style={{ color: '#FFE800', fontSize: 24, fontWeight: '900' }}>
                                            {item.total.toLocaleString()}원
                                        </Text>
                                    </View>
                                )}
                            />
                        )}
                        <TouchableOpacity style={{ marginTop: 20, padding: 15 }} onPress={clearHistory}>
                            <Text style={{ color: '#F33', fontSize: 16, fontWeight: 'bold' }}>🗑 전체 기록 삭제</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 설정 모달 */}
            <Modal transparent={true} visible={settingsModalVisible} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalBox, { width: '93%', padding: 22, backgroundColor: '#1A1C20', maxHeight: '90%' }]}>
                        {/* 헤더 */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 18, alignItems: 'center' }}>
                            <Text style={styles.modalTitle}>⚙️ 스캐너 설정</Text>
                            <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                                <Text style={{ color: '#FFF', fontSize: 24, fontWeight: 'bold' }}>✖</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>

                            {/* ── 1. 격자 규격 ── */}
                            <View style={styles.settingSection}>
                                <Text style={styles.sectionTitle}>📏 표준 격자 규격 (Grid Size)</Text>
                                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                        <Text style={styles.settingSub}>가로 줄 수 (행)</Text>
                                        <TextInput
                                            style={styles.gridInput}
                                            value={String(gridRows)}
                                            keyboardType="numeric"
                                            onChangeText={v => {
                                                const n = parseInt(v);
                                                if (!isNaN(n) && n > 0) {
                                                    setGridRows(n);
                                                    saveSettings(isBlindZone, calcMode, n, gridCols);
                                                }
                                            }}
                                        />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 8 }}>
                                        <Text style={styles.settingSub}>세로 칸 수 (열)</Text>
                                        <TextInput
                                            style={styles.gridInput}
                                            value={String(gridCols)}
                                            keyboardType="numeric"
                                            onChangeText={v => {
                                                const n = parseInt(v);
                                                if (!isNaN(n) && n > 0) {
                                                    setGridCols(n);
                                                    saveSettings(isBlindZone, calcMode, gridRows, n);
                                                }
                                            }}
                                        />
                                    </View>
                                </View>
                                <Text style={{ color: '#555', fontSize: 11, marginTop: 6 }}>
                                    현재: {gridRows}행 × {gridCols}열 격자
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            {/* ── 2. 날짜 열 무시 ── */}
                            <View style={styles.settingSection}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.settingLabel}>📆 날짜 열(1번 열) 무시</Text>
                                        <Text style={styles.settingSub}>켜면 맨 왼쪽 첫 번째 열을 계산에서 제외합니다.</Text>
                                    </View>
                                    <Switch
                                        value={isBlindZone}
                                        onValueChange={v => { setIsBlindZone(v); saveSettings(v, calcMode, gridRows, gridCols); }}
                                        trackColor={{ false: "#333", true: "#00FFCC" }}
                                        thumbColor={isBlindZone ? "#FFF" : "#CCC"}
                                    />
                                </View>
                            </View>

                            <View style={styles.divider} />

                            {/* ── 3. 정산 모드 ── */}
                            <View style={styles.settingSection}>
                                <Text style={styles.sectionTitle}>🧮 정산 모드</Text>
                                <View style={{ marginTop: 10 }}>
                                    {[
                                        { key: 'ROW', icon: '➡️', label: '가로줄(행) 합산', sub: '1일 합, 2일 합... 행 단위로 합산' },
                                        { key: 'COL', icon: '⬇️', label: '세로줄(열) 합산', sub: '조식 합, 중식 합... 열 단위로 합산' },
                                        { key: 'ALL', icon: '🌎', label: '전체 합산', sub: '모든 숫자를 하나로 합산' },
                                    ].map(m => (
                                        <TouchableOpacity
                                            key={m.key}
                                            style={[styles.modeBtn, calcMode === m.key && styles.modeBtnActive]}
                                            onPress={() => { setCalcMode(m.key); saveSettings(isBlindZone, m.key, gridRows, gridCols); }}
                                        >
                                            <Text style={[styles.modeBtnText, calcMode === m.key && { color: '#000' }]}>{m.icon} {m.label}</Text>
                                            <Text style={[styles.modeBtnSub, calcMode === m.key && { color: '#333' }]}>{m.sub}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // ── 격자 오버레이 ──
    gridLineRow: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,255,204,0.25)' },
    gridLineCol: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,255,204,0.25)' },
    gridBorder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: 'rgba(0,255,204,0.5)' },
    blindZoneOverlay: { position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: 'rgba(255,0,0,0.3)', borderRightWidth: 2, borderRightColor: '#FF3366', zIndex: 10 },

    // ── 카메라 UI ──
    topHistoryBtn: { position: 'absolute', top: 55, left: 20, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, zIndex: 999, borderWidth: 1, borderColor: '#00FFCC' },
    topHistoryText: { color: '#00FFCC', fontSize: 14, fontWeight: 'bold' },
    topSettingsBtn: { position: 'absolute', top: 55, right: 20, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, zIndex: 999, borderWidth: 1, borderColor: '#CCC' },
    topSettingsText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
    statusBox: { position: 'absolute', top: 115, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 999 },
    statusText: { color: '#00FFCC', fontSize: 16, fontWeight: 'bold' },
    guideBox: { position: 'absolute', bottom: 120, alignSelf: 'center', zIndex: 999 },
    guideText: { color: '#FFE800', fontSize: 15, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, overflow: 'hidden' },
    captureArea: { position: 'absolute', bottom: 45, alignSelf: 'center', zIndex: 999 },
    captureButton: { backgroundColor: '#00FFCC', paddingVertical: 18, paddingHorizontal: 48, borderRadius: 30, shadowColor: '#00FFCC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 15 },
    captureText: { color: '#000', fontSize: 20, fontWeight: '900' },
    laserLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#FF0055', shadowColor: '#FF0055', shadowOpacity: 1, shadowRadius: 8, elevation: 5 },
    gridBadge: { position: 'absolute', top: 55, alignSelf: 'center', backgroundColor: 'rgba(0,255,204,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,255,204,0.4)', zIndex: 999 },
    gridBadgeText: { color: '#00FFCC', fontSize: 13, fontWeight: '700' },

    // ── 결과 화면 ──
    resultScreen: { flex: 1, paddingTop: 55, paddingHorizontal: 10, paddingBottom: 20 },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 5 },
    headerText: { color: '#FFE800', fontSize: 24, fontWeight: '900' },
    headerSub: { color: '#888', fontSize: 12, marginTop: 3 },
    totalBadge: { backgroundColor: 'rgba(0,255,204,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 2, borderColor: '#00FFCC', alignItems: 'center' },
    totalBadgeLabel: { color: '#00FFCC', fontSize: 11, fontWeight: '700' },
    totalBadgeValue: { color: '#FFE800', fontSize: 20, fontWeight: '900', marginTop: 2 },

    // ── 엑셀 표 ──
    tableContainer: { flex: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
    tableHeaderCell: { height: 32, backgroundColor: '#1e1e2e', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#333' },
    tableHeaderText: { color: '#00FFCC', fontSize: 12, fontWeight: '800' },
    tableIndexCell: { height: 28, backgroundColor: '#1a1a2a', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#333' },
    tableIndexText: { color: '#666', fontSize: 11, fontWeight: '600' },
    tableDataCell: { height: 28, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#1e1e1e' },
    tableDataCellActive: { backgroundColor: '#0d1f1a' },
    tableDataText: { color: '#444', fontSize: 12 },

    // ── 결과 하단 버튼 ──
    resultFooter: { flexDirection: 'row', gap: 10, marginTop: 10 },
    actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 20, alignItems: 'center' },
    actionBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },

    // ── 공통 모달 ──
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { width: '85%', backgroundColor: '#222', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#00FFCC' },
    modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    modalInput: { width: '100%', backgroundColor: '#FFF', fontSize: 20, color: '#000', padding: 14, borderRadius: 10, textAlign: 'center', fontWeight: 'bold', marginBottom: 18 },
    modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    modalButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 10, marginHorizontal: 4 },
    modalButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
    criticalErrorBox: { backgroundColor: 'rgba(255,0,0,0.9)', padding: 18, borderRadius: 12, marginVertical: 8 },
    criticalErrorText: { color: '#FFF', fontSize: 15, fontWeight: '800', textAlign: 'center' },

    // ── 기록 보관함 ──
    historyBottomSheet: { width: '100%', height: '80%', backgroundColor: '#111', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, alignItems: 'center', borderTopWidth: 2, borderTopColor: '#444' },
    historyCard: { width: '100%', backgroundColor: '#222', padding: 18, borderRadius: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#333' },

    // ── 설정 모달 ──
    sectionTitle: { color: '#00FFCC', fontSize: 15, fontWeight: '800', alignSelf: 'flex-start', marginBottom: 12 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginVertical: 8 },
    settingLabel: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    settingSub: { color: '#888', fontSize: 12, marginTop: 3 },
    divider: { height: 1, backgroundColor: '#333', marginVertical: 14, width: '100%' },
    settingSection: { width: '100%', marginBottom: 4 },
    modeBtn: { width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', padding: 13, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: '#333' },
    modeBtnActive: { backgroundColor: '#00FFCC', borderColor: '#00FFCC' },
    modeBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
    modeBtnSub: { color: '#888', fontSize: 11, marginTop: 4 },
    gridInput: { backgroundColor: '#0d1117', color: '#00FFCC', padding: 10, borderRadius: 8, fontSize: 20, fontWeight: 'bold', textAlign: 'center', borderWidth: 1, borderColor: '#333', marginTop: 6 },
});
