import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, Animated, Easing, Vibration, Dimensions, FlatList, Modal, TextInput, Share, Switch, ScrollView } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function App() {
    const { hasPermission, requestPermission } = useCameraPermission();
    const [mediaPermissionResponse, requestMediaPermission] = MediaLibrary.usePermissions();
    const device = useCameraDevice('back');

    const cameraRef = useRef(null);
    const viewShotRef = useRef(null);

    const [photo, setPhoto] = useState(null);
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
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);

    // 설정값
    const [isBlindZone, setIsBlindZone] = useState(false);
    const [calcMode, setCalcMode] = useState("ROW");
    const [gridRows, setGridRows] = useState(31);
    const [gridCols, setGridCols] = useState(5);

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

    // ════════════════════════════════════════════
    // 📊 범용 격자(Generic Grid) 매핑 엔진
    // ════════════════════════════════════════════
    const parseToGrid = (result, blind, imgW, imgH, rows, cols) => {
        if (!result || !result.blocks) return null;

        const cellMap = Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ({ original: '', value: 0 }))
        );

        const iW = imgW || width;
        const iH = imgH || height;

        result.blocks.forEach(b => {
            if (!b.lines) return;
            b.lines.forEach(l => {
                if (!l.frame) return;

                let colIdx = Math.floor((l.frame.x / iW) * cols);
                let rowIdx = Math.floor((l.frame.y / iH) * rows);
                colIdx = Math.max(0, Math.min(cols - 1, colIdx));
                rowIdx = Math.max(0, Math.min(rows - 1, rowIdx));

                if (blind && colIdx === 0) return;

                let cleanText = l.text.replace(/x/gi, '*').replace(/×/g, '*').replace(/÷/g, '/');
                cleanText = cleanText.replace(/[^0-9+\-*/.]/g, ' ');
                cleanText.split(' ').filter(p => p.length > 0).forEach(p => {
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

    const summarizeGrid = (cellMap, mode, rows, cols) => {
        let total = 0;
        const list = [];

        if (mode === 'COL') {
            for (let c = 0; c < cols; c++) {
                let colSum = 0, colLabel = '';
                for (let r = 0; r < rows; r++) {
                    if (cellMap[r][c].value > 0) {
                        colSum += cellMap[r][c].value;
                        colLabel = colLabel ? colLabel + '+' + cellMap[r][c].original : cellMap[r][c].original;
                    }
                }
                if (colSum > 0) { list.push({ col: c, original: colLabel, value: colSum }); total += colSum; }
            }
        } else {
            for (let r = 0; r < rows; r++) {
                let rowSum = 0, rowLabel = '';
                for (let c = 0; c < cols; c++) {
                    if (cellMap[r][c].value > 0) {
                        rowSum += cellMap[r][c].value;
                        rowLabel = rowLabel ? rowLabel + '+' + cellMap[r][c].original : cellMap[r][c].original;
                    }
                }
                if (rowSum > 0) { list.push({ row: r, original: rowLabel, value: rowSum }); total += rowSum; }
            }
        }

        return { total, list };
    };

    // ════════════════════════════════════════════
    // 📸 촬영 및 처리
    // ════════════════════════════════════════════
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

            let bestGrid = null, bestCount = -1;
            tries.forEach(({ result, iW, iH }) => {
                const cellMap = parseToGrid(result, isBlindZone, iW, iH, gridRows, gridCols);
                if (!cellMap) return;
                let count = 0;
                cellMap.forEach(row => row.forEach(cell => { if (cell.value > 0) count++; }));
                if (count > bestCount) { bestCount = count; bestGrid = cellMap; }
            });

            if (!bestGrid || bestCount === 0) throw new Error("화면에서 숫자를 찾지 못했습니다.");

            const { total } = summarizeGrid(bestGrid, calcMode, gridRows, gridCols);
            setPhoto(rawImages[0]);
            setGridData(bestGrid);
            setTotalSum(total);
            Vibration.vibrate([100, 100, 100]);
            setStatus("✅ 정산 완료!");
            stopScanner();

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

    const openCellEdit = (r, c) => {
        setEditCell({ r, c });
        setEditText(gridData[r][c].original);
        setEditModalVisible(true);
    };

    const saveCellEdit = () => {
        try {
            const val = Number(new Function('return ' + (editText || '0'))());
            if (isNaN(val)) throw new Error();
            const newGrid = gridData.map(row => row.map(cell => ({ ...cell })));
            newGrid[editCell.r][editCell.c] = { original: editText, value: val };
            setGridData(newGrid);
            const { total } = summarizeGrid(newGrid, calcMode, gridRows, gridCols);
            setTotalSum(total);
            setEditModalVisible(false);
        } catch (e) { Alert.alert("오류", "올바른 숫자나 수식을 입력하세요."); }
    };

    const clearHistory = () => {
        Alert.alert("기록 초기화", "모든 기록을 삭제하시겠습니까?", [
            { text: "취소", style: "cancel" },
            { text: "삭제", style: "destructive", onPress: () => { AsyncStorage.removeItem('@numlens_history'); setHistoryList([]); } }
        ]);
    };

    const retakePicture = () => {
        setPhoto(null); setGridData([]); setTotalSum(0); setStatus("대기중"); setErrorLog(""); stopScanner();
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

    // ── 카메라 격자 가이드 ──
    const renderGridOverlay = () => {
        const lines = [];
        for (let r = 1; r < gridRows; r++) {
            lines.push(<View key={`r${r}`} style={[styles.gridLineRow, { top: `${(r / gridRows) * 100}%` }]} />);
        }
        for (let c = 1; c < gridCols; c++) {
            lines.push(<View key={`c${c}`} style={[styles.gridLineCol, { left: `${(c / gridCols) * 100}%` }]} />);
        }
        return <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', borderWidth: 2, borderColor: 'rgba(0,255,204,0.4)' }]}>{lines}</View>;
    };

    // ── 결과 엑셀 표 ──
    const renderResultTable = () => {
        if (!gridData || gridData.length === 0) return null;
        const colW = Math.max(58, (width - 40 - 36) / gridCols);
        const colSums = Array(gridCols).fill(0);
        const rowSums = Array(gridRows).fill(0);
        gridData.forEach((row, r) => row.forEach((cell, c) => { colSums[c] += cell.value; rowSums[r] += cell.value; }));

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <ScrollView showsVerticalScrollIndicator={true} nestedScrollEnabled>
                    <View>
                        {/* 헤더 */}
                        <View style={styles.tableRow}>
                            <View style={[styles.thCell, { width: 32 }]}><Text style={styles.thText}>#</Text></View>
                            {Array.from({ length: gridCols }, (_, c) => (
                                <View key={c} style={[styles.thCell, { width: colW }]}>
                                    <Text style={styles.thText}>{String.fromCharCode(65 + c)}</Text>
                                </View>
                            ))}
                            <View style={[styles.thCell, { width: colW, backgroundColor: '#0d2a1a' }]}>
                                <Text style={[styles.thText, { color: '#00FFCC' }]}>합계</Text>
                            </View>
                        </View>

                        {/* 데이터 행 */}
                        {gridData.map((row, r) => {
                            const hasData = row.some(c => c.value > 0);
                            return (
                                <View key={r} style={[styles.tableRow, !hasData && { opacity: 0.25 }]}>
                                    <View style={[styles.idxCell, { width: 32 }]}><Text style={styles.idxText}>{r + 1}</Text></View>
                                    {row.map((cell, c) => (
                                        <TouchableOpacity key={c}
                                            style={[styles.tdCell, { width: colW }, cell.value > 0 && styles.tdCellActive]}
                                            onPress={() => openCellEdit(r, c)}>
                                            <Text style={[styles.tdText, cell.value > 0 && styles.tdTextActive]}>
                                                {cell.value > 0 ? cell.value.toLocaleString() : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    <View style={[styles.tdCell, { width: colW, backgroundColor: '#0d1f14', borderLeftWidth: 1.5, borderLeftColor: '#00FFCC' }]}>
                                        <Text style={[styles.tdText, { color: '#00FFCC', fontWeight: '700' }]}>
                                            {rowSums[r] > 0 ? rowSums[r].toLocaleString() : ''}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}

                        {/* 합계 행 */}
                        <View style={[styles.tableRow, { borderTopWidth: 2, borderTopColor: '#00FFCC' }]}>
                            <View style={[styles.idxCell, { width: 32, backgroundColor: '#0d2a1a' }]}><Text style={[styles.idxText, { color: '#00FFCC' }]}>계</Text></View>
                            {colSums.map((s, c) => (
                                <View key={c} style={[styles.tdCell, { width: colW, backgroundColor: '#0d1f14' }]}>
                                    <Text style={[styles.tdText, { color: '#00FFCC', fontWeight: '800' }]}>{s > 0 ? s.toLocaleString() : ''}</Text>
                                </View>
                            ))}
                            <View style={[styles.tdCell, { width: colW, backgroundColor: '#1a1000' }]}>
                                <Text style={[styles.tdText, { color: '#FFE800', fontWeight: '900', fontSize: 13 }]}>{totalSum.toLocaleString()}</Text>
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
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.78)' }]} />
                    <View style={styles.resultScreen}>
                        <View style={styles.resultHeader}>
                            <View>
                                <Text style={styles.headerText}>📊 정산 완료</Text>
                                <Text style={styles.headerSub}>{`${gridRows}행 × ${gridCols}열  |  ${calcMode} 모드`}</Text>
                            </View>
                            <View style={styles.totalBadge}>
                                <Text style={styles.totalLabel}>총합</Text>
                                <Text style={styles.totalValue}>{totalSum.toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={styles.tableContainer}>{renderResultTable()}</View>

                        <Text style={{ color: '#555', fontSize: 11, textAlign: 'center', marginTop: 5 }}>셀 터치 시 수정 가능</Text>

                        {errorLog !== "" && <View style={styles.errorBox}><Text style={styles.errorText}>{errorLog}</Text></View>}

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
                    {renderGridOverlay()}
                    {isBlindZone && <View style={[styles.blindZone, { width: `${100 / gridCols}%` }]} />}
                    <Animated.View style={[styles.laserLine, { transform: [{ translateY: laserTranslateY }] }]} pointerEvents="none" />

                    <View style={styles.gridBadge}><Text style={styles.gridBadgeText}>{`${gridRows} × ${gridCols}`}</Text></View>
                    <TouchableOpacity style={styles.topLeft} onPress={() => setHistoryModalVisible(true)}>
                        <Text style={styles.topLeftText}>📂 내역</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.topRight} onPress={() => setSettingsModalVisible(true)}>
                        <Text style={styles.topRightText}>⚙️ 설정</Text>
                    </TouchableOpacity>
                    {status !== "대기중" && <View style={styles.statusBox}><Text style={styles.statusText}>{status}</Text></View>}
                    <View style={styles.guideBox}><Text style={styles.guideText}>📋 격자에 표를 맞추고 촬영하세요</Text></View>
                    <View style={styles.captureArea}>
                        <TouchableOpacity style={styles.captureButton} onPress={takePictureAndProcess} activeOpacity={0.7}>
                            <Text style={styles.captureText}>📸 강력 연속스캔</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* 셀 편집 모달 */}
            <Modal transparent visible={editModalVisible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>셀 값 수정</Text>
                        <Text style={{ color: '#888', marginBottom: 14 }}>{`[${editCell.r + 1}행, ${String.fromCharCode(65 + editCell.c)}열]`}</Text>
                        <TextInput style={styles.modalInput} value={editText} onChangeText={setEditText} keyboardType="numbers-and-punctuation" autoFocus />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F33' }]} onPress={() => {
                                const newGrid = gridData.map(row => row.map(cell => ({ ...cell })));
                                newGrid[editCell.r][editCell.c] = { original: '', value: 0 };
                                setGridData(newGrid);
                                const { total } = summarizeGrid(newGrid, calcMode, gridRows, gridCols);
                                setTotalSum(total);
                                setEditModalVisible(false);
                            }}><Text style={styles.modalBtnText}>🗑</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#555' }]} onPress={() => setEditModalVisible(false)}><Text style={styles.modalBtnText}>취소</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#00FFCC' }]} onPress={saveCellEdit}><Text style={[styles.modalBtnText, { color: '#000' }]}>저장</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 기록 모달 */}
            <Modal transparent visible={historyModalVisible} animationType="slide">
                <View style={[styles.modalOverlay, { justifyContent: 'flex-end' }]}>
                    <View style={styles.bottomSheet}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 18 }}>
                            <Text style={styles.modalTitle}>🗂️ 과거 결산</Text>
                            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                                <Text style={{ color: '#00FFCC', fontSize: 17, fontWeight: 'bold' }}>닫기 ✖</Text>
                            </TouchableOpacity>
                        </View>
                        {historyList.length === 0
                            ? <Text style={{ color: '#AAA', marginTop: 40 }}>저장된 기록이 없습니다.</Text>
                            : <FlatList data={historyList} keyExtractor={i => i.id} style={{ width: '100%' }}
                                renderItem={({ item }) => (
                                    <View style={styles.historyCard}>
                                        <View>
                                            <Text style={{ color: '#CCC', fontSize: 13 }}>{item.date}</Text>
                                            <Text style={{ color: '#666', fontSize: 12, marginTop: 3 }}>{item.gridRows ?? '?'}행 × {item.gridCols ?? '?'}열</Text>
                                        </View>
                                        <Text style={{ color: '#FFE800', fontSize: 22, fontWeight: '900' }}>{item.total.toLocaleString()}원</Text>
                                    </View>
                                )} />
                        }
                        <TouchableOpacity style={{ marginTop: 16, padding: 14 }} onPress={clearHistory}>
                            <Text style={{ color: '#F33', fontSize: 15, fontWeight: 'bold' }}>🗑 전체 삭제</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ════════════════════════════════
                ⚙️ 설정 모달
                ════════════════════════════════ */}
            <Modal transparent visible={settingsModalVisible} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.settingsBox}>

                        {/* 헤더 */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Text style={styles.modalTitle}>⚙️ 스캐너 설정</Text>
                            <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                                <Text style={{ color: '#FFF', fontSize: 26, fontWeight: 'bold' }}>✖</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>

                            {/* 📏 격자 규격 */}
                            <Text style={styles.sectionLabel}>📏 격자 규격 (Grid Size)</Text>
                            <View style={{ flexDirection: 'row', marginTop: 10, marginBottom: 6 }}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.inputLabel}>가로 줄 수 (행)</Text>
                                    <TextInput
                                        style={styles.numInput}
                                        value={String(gridRows)}
                                        keyboardType="numeric"
                                        selectTextOnFocus
                                        onChangeText={v => {
                                            const n = parseInt(v);
                                            if (!isNaN(n) && n > 0) { setGridRows(n); saveSettings(isBlindZone, calcMode, n, gridCols); }
                                        }}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.inputLabel}>세로 칸 수 (열)</Text>
                                    <TextInput
                                        style={styles.numInput}
                                        value={String(gridCols)}
                                        keyboardType="numeric"
                                        selectTextOnFocus
                                        onChangeText={v => {
                                            const n = parseInt(v);
                                            if (!isNaN(n) && n > 0) { setGridCols(n); saveSettings(isBlindZone, calcMode, gridRows, n); }
                                        }}
                                    />
                                </View>
                            </View>
                            <Text style={{ color: '#444', fontSize: 11, marginBottom: 18 }}>현재: {gridRows}행 × {gridCols}열</Text>

                            {/* 날짜 열 무시 */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.sectionLabel}>📆 날짜 열(1번 열) 무시</Text>
                                    <Text style={{ color: '#666', fontSize: 12, marginTop: 3 }}>첫 번째 열(날짜)을 계산에서 제외</Text>
                                </View>
                                <Switch
                                    value={isBlindZone}
                                    onValueChange={v => { setIsBlindZone(v); saveSettings(v, calcMode, gridRows, gridCols); }}
                                    trackColor={{ false: "#333", true: "#00FFCC" }}
                                    thumbColor={isBlindZone ? "#FFF" : "#AAA"}
                                />
                            </View>

                            {/* 정산 모드 */}
                            <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>🧮 정산 모드</Text>
                            {[
                                { key: 'ROW', label: '➡️ 가로줄 합산', sub: '행 단위 합산 (1일 합, 2일 합...)' },
                                { key: 'COL', label: '⬇️ 세로줄 합산', sub: '열 단위 합산 (조식 합, 중식 합...)' },
                                { key: 'ALL', label: '🌎 전체 합산', sub: '모든 숫자를 하나로' },
                            ].map(m => (
                                <TouchableOpacity key={m.key}
                                    style={[styles.modeBtn, calcMode === m.key && styles.modeBtnOn]}
                                    onPress={() => { setCalcMode(m.key); saveSettings(isBlindZone, m.key, gridRows, gridCols); }}>
                                    <Text style={[styles.modeBtnLabel, calcMode === m.key && { color: '#000' }]}>{m.label}</Text>
                                    <Text style={[styles.modeBtnSub, calcMode === m.key && { color: '#333' }]}>{m.sub}</Text>
                                </TouchableOpacity>
                            ))}

                            <View style={{ height: 30 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // 격자 오버레이
    gridLineRow: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,255,204,0.2)' },
    gridLineCol: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,255,204,0.2)' },
    blindZone: { position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: 'rgba(255,30,30,0.28)', borderRightWidth: 2, borderRightColor: '#FF3366', zIndex: 10 },
    laserLine: { position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#FF0055', shadowColor: '#FF0055', shadowOpacity: 1, shadowRadius: 8, elevation: 5 },
    gridBadge: { position: 'absolute', top: 56, alignSelf: 'center', backgroundColor: 'rgba(0,255,204,0.12)', paddingHorizontal: 16, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,255,204,0.35)', zIndex: 999 },
    gridBadgeText: { color: '#00FFCC', fontSize: 14, fontWeight: '800' },

    // 카메라 UI
    topLeft: { position: 'absolute', top: 56, left: 16, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, zIndex: 999, borderWidth: 1, borderColor: '#00FFCC' },
    topLeftText: { color: '#00FFCC', fontSize: 14, fontWeight: 'bold' },
    topRight: { position: 'absolute', top: 56, right: 16, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, zIndex: 999, borderWidth: 1, borderColor: '#888' },
    topRightText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
    statusBox: { position: 'absolute', top: 112, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.82)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 999 },
    statusText: { color: '#00FFCC', fontSize: 15, fontWeight: 'bold' },
    guideBox: { position: 'absolute', bottom: 118, alignSelf: 'center', zIndex: 999 },
    guideText: { color: '#FFE800', fontSize: 14, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, overflow: 'hidden' },
    captureArea: { position: 'absolute', bottom: 44, alignSelf: 'center', zIndex: 999 },
    captureButton: { backgroundColor: '#00FFCC', paddingVertical: 18, paddingHorizontal: 46, borderRadius: 30, shadowColor: '#00FFCC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 15 },
    captureText: { color: '#000', fontSize: 20, fontWeight: '900' },

    // 결과 화면
    resultScreen: { flex: 1, paddingTop: 52, paddingHorizontal: 10, paddingBottom: 16 },
    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
    headerText: { color: '#FFE800', fontSize: 22, fontWeight: '900' },
    headerSub: { color: '#666', fontSize: 11, marginTop: 3 },
    totalBadge: { backgroundColor: 'rgba(0,255,204,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: '#00FFCC', alignItems: 'center' },
    totalLabel: { color: '#00FFCC', fontSize: 10, fontWeight: '700' },
    totalValue: { color: '#FFE800', fontSize: 18, fontWeight: '900', marginTop: 2 },

    // 엑셀 표
    tableContainer: { flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
    thCell: { height: 30, backgroundColor: '#15202b', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#222' },
    thText: { color: '#00FFCC', fontSize: 11, fontWeight: '800' },
    idxCell: { height: 26, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#222' },
    idxText: { color: '#555', fontSize: 10, fontWeight: '600' },
    tdCell: { height: 26, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#111' },
    tdCellActive: { backgroundColor: '#071a10' },
    tdText: { color: '#333', fontSize: 11 },
    tdTextActive: { color: '#E0FFE8', fontWeight: '700' },

    // 결과 하단
    resultFooter: { flexDirection: 'row', gap: 8, marginTop: 8 },
    actionBtn: { flex: 1, paddingVertical: 13, borderRadius: 18, alignItems: 'center' },
    actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '800' },

    // 모달 공통
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
    modalBox: { width: '88%', backgroundColor: '#1a1a1a', borderRadius: 18, padding: 22, alignItems: 'center', borderWidth: 1.5, borderColor: '#00FFCC' },
    modalTitle: { color: '#FFF', fontSize: 19, fontWeight: '800' },
    modalInput: { width: '100%', backgroundColor: '#FFF', fontSize: 20, color: '#000', padding: 14, borderRadius: 10, textAlign: 'center', fontWeight: 'bold', marginBottom: 16 },
    modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8 },
    modalBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 10 },
    modalBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
    errorBox: { backgroundColor: 'rgba(255,0,0,0.85)', padding: 14, borderRadius: 10, marginVertical: 6 },
    errorText: { color: '#FFF', fontSize: 13, fontWeight: '800' },

    // 기록 모달
    bottomSheet: { width: '100%', height: '80%', backgroundColor: '#111', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, alignItems: 'center', borderTopWidth: 1.5, borderTopColor: '#333' },
    historyCard: { width: '100%', backgroundColor: '#1a1a1a', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a2a' },

    // ── 설정 모달 ──
    settingsBox: {
        width: '92%',
        maxHeight: '88%',
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1.5,
        borderColor: '#00FFCC',
    },
    sectionLabel: { color: '#00FFCC', fontSize: 15, fontWeight: '800' },
    inputLabel: { color: '#888', fontSize: 12, marginBottom: 6 },
    numInput: {
        backgroundColor: '#1a1a2e',
        color: '#00FFCC',
        fontSize: 22,
        fontWeight: '900',
        textAlign: 'center',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#00FFCC',
    },
    modeBtn: { width: '100%', backgroundColor: '#1a1a1a', padding: 13, borderRadius: 10, marginBottom: 8, borderWidth: 1.5, borderColor: '#2a2a2a' },
    modeBtnOn: { backgroundColor: '#00FFCC', borderColor: '#00FFCC' },
    modeBtnLabel: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
    modeBtnSub: { color: '#666', fontSize: 11, marginTop: 4 },
});