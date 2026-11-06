# AudioWeb

> 서버 없이 브라우저 안에서 100% 온디바이스로 동작하는 텍스트-음성 변환(TTS) 및 음성-텍스트 변환(STT) PWA 웹앱입니다.

## 기능

1. **텍스트 → MP3 (TTS)**
   - 모델: `Kokoro-82M-v1.0-ONNX` (WASM) + `lamejs`
   - 영미권 음성 5종(Heart, Bella, Michael, Emma, George) 및 재생 속도 조절 지원
   - 문장 자동 분할 및 MP3 파일 다운로드

2. **MP3 → 텍스트 (STT)**
   - 모델: `Whisper-base.en` (transformers.js WASM) + Web Audio API
   - 무음 에너지 기반 자동 발화 턴 분절
   - 강사/학생 자동 교대 라벨링 및 라벨 반전 지원
   - 턴별 텍스트 인라인 수정 및 해당 구간 오디오 즉시 재생
   - `.txt` 다운로드 및 로컬 히스토리 관리

3. **오프라인 PWA**
   - Service Worker를 통해 첫 사용 시 모델 다운로드 후 완전 오프라인 지원
   - 모바일 브라우저 '홈 화면에 추가' 지원

## 라이선스
MIT
