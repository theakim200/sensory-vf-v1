const permissionOverlay = document.getElementById('permission-overlay');
const grantButton = document.getElementById('grant-permission');
const textInput = document.getElementById('text-input');
const debugInfo = document.getElementById('debug-info');

let currentItalicValue = 50; // 현재 italic 값 저장
let currentWidthValue = 100; // 현재 width 값 저장
let lastInputTime = null; // 이전 입력 시간

// 권한 요청 버튼 클릭
grantButton.addEventListener('click', async () => {
    // iOS 13+ 권한 요청
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                startOrientationTracking();
                permissionOverlay.classList.add('hidden');
            }
        } catch (error) {
            console.error('Permission error:', error);
        }
    } else {
        // Android 또는 iOS 12 이하
        startOrientationTracking();
        permissionOverlay.classList.add('hidden');
    }
});

// 방향 센서 추적 시작
function startOrientationTracking() {
    window.addEventListener('deviceorientation', handleOrientation);
}

// 방향 센서 처리
function handleOrientation(event) {
    const gamma = event.gamma; // 좌우 기울기: -90 ~ +90
    
    if (gamma !== null) {
        // gamma를 italic axis 값으로 변환 (0-100)
        const italicValue = ((gamma + 90) / 180) * 100;
        
        // 범위 제한
        currentItalicValue = Math.max(0, Math.min(100, italicValue));
        
        // 디버그 정보 표시
        debugInfo.textContent = `gamma: ${gamma.toFixed(1)}° | italic: ${currentItalicValue.toFixed(1)} | width: ${currentWidthValue.toFixed(1)}`;
    }
}

// beforeinput 이벤트로 새 글자만 감지
textInput.addEventListener('beforeinput', (event) => {
    // 일반 텍스트 입력이 아니면 무시
    if (event.inputType !== 'insertText' && event.inputType !== 'insertLineBreak') {
        return;
    }
    
    // 기본 동작 막기
    event.preventDefault();
    
    // 타자 속도 측정
    const currentTime = Date.now();
    let typingInterval = 0;
    
    if (lastInputTime !== null) {
        typingInterval = currentTime - lastInputTime;
    }
    
    lastInputTime = currentTime;
    
    // 타자 간격을 width 값으로 변환 (역방향: 빠를수록 작은 값)
    // 100ms 이하 = width 10 (condensed)
    // 450ms 정도 = width 100 (normal)
    // 800ms 이상 = width 190 (expanded)
    if (typingInterval === 0) {
        // 첫 글자
        currentWidthValue = 100;
    } else if (typingInterval > 2000) {
        // 2초 이상 정지 = 새로운 단어
        currentWidthValue = 100;
    } else {
        // 타자 간격을 width로 매핑 (역방향)
        // 빠름(100ms) → 10, 보통(450ms) → 100, 느림(800ms) → 190
        const normalized = Math.max(100, Math.min(800, typingInterval));
        currentWidthValue = ((normalized - 100) / 700) * 180 + 10;
    }
    
    // 입력될 텍스트 가져오기
    const text = event.data || '\n';
    
    // 현재 선택 영역 가져오기
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    // 각 글자를 span으로 감싸서 생성
    for (let char of text) {
        const span = document.createElement('span');
        span.textContent = char;
        span.style.fontVariationSettings = `'wght' 90, 'wdth' ${currentWidthValue}, 'ital' ${currentItalicValue}`;
        
        // span을 현재 위치에 삽입
        range.insertNode(span);
        
        // 커서를 삽입된 span 뒤로 이동
        range.setStartAfter(span);
        range.setEndAfter(span);
    }
    
    // 커서 위치 확정 (선택 없이)
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
});