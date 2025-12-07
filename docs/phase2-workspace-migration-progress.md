# Phase 2: Workspace 서브모듈 분리 진행 상황

## 완료된 작업 ✅

### todos 서브모듈 분리 완료
1. ✅ 서브모듈 디렉토리 구조 생성
2. ✅ todos 서브모듈 파일 이동:
   - Components: TodoList, TodoItem, TodoForm, TodoFilter, TodoDetailModal
   - Services: todoService, todoNotificationService
   - Store: todoStore
   - Types: todo.types
3. ✅ todos 서브모듈 내부 import 경로 수정
4. ✅ todos 서브모듈 index.ts 생성
5. ✅ AllTodosPage.tsx import 경로 업데이트
6. ✅ workspace 내부 Todo 관련 import 경로 업데이트:
   - MessageToTodoButton.tsx
   - TodoList.tsx (workspace/components에 남아있는 버전)
7. ✅ workspace/index.ts에 todos export 추가

## 남은 작업

### todos 서브모듈 정리 필요
- [ ] workspace/components에 남아있는 원본 Todo 파일들 확인 및 정리
- [ ] workspace/services에 남아있는 원본 Todo 서비스 파일들 확인 및 정리
- [ ] workspace/store에 남아있는 원본 todoStore.ts 확인 및 정리

### 다음 서브모듈 작업
1. **reactions 서브모듈** (가장 독립적)
2. **threads 서브모듈**
3. **messages 서브모듈**
4. **channels 서브모듈**
5. **approvals 서브모듈**
6. **members 서브모듈**
7. **notifications 서브모듈**

## 참고
- todos 서브모듈은 가장 독립적이어서 먼저 완료
- 나머지 서브모듈은 의존성이 더 복잡할 수 있음
- 각 서브모듈 완료 후 빌드 테스트 권장


