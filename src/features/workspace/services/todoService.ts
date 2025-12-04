/**
 * 할 일 서비스
 * Firestore 기반 할 일 관리
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/shared/services/firebase/config';
import { removeUndefinedFields } from '@/shared/utils/firestoreUtils';
import { getAllUsersWithAuthInfo } from '@/shared/services/firebase/userManagement';
import type {
  Todo,
  CreateTodoData,
  UpdateTodoData,
  TodoFilterOptions,
  TodoStats,
} from '../types/todo.types';

/**
 * 할 일 컬렉션 경로 가져오기
 */
const getTodosCollectionPath = (workspaceId: string, channelId: string) => {
  return `workspaces/${workspaceId}/channels/${channelId}/todos`;
};

export class TodoService {
  /**
   * 할 일 생성
   */
  static async createTodo(
    data: CreateTodoData,
    createdBy: string
  ): Promise<string> {
    if (!db) throw new Error('Firestore is not initialized');

    const now = Timestamp.now();
    const dueDate = data.dueDate
      ? data.dueDate instanceof Date
        ? Timestamp.fromDate(data.dueDate)
        : data.dueDate
      : undefined;

    const todoData: Omit<Todo, 'id'> = {
      channelId: data.channelId,
      workspaceId: data.workspaceId,
      title: data.title,
      description: data.description,
      assigneeIds: data.assigneeIds || [],
      dueDate,
      completed: false,
      status: data.status || 'todo',
      createdAt: now,
      createdBy,
      updatedAt: now,
      updatedBy: createdBy,
      messageId: data.messageId,
      priority: data.priority || 'medium',
    };

    // undefined 필드 제거
    const cleanedData = removeUndefinedFields(todoData);
    const todosRef = collection(
      db,
      getTodosCollectionPath(data.workspaceId, data.channelId)
    );
    const docRef = await addDoc(todosRef, cleanedData);
    return docRef.id;
  }

  /**
   * 할 일 조회
   */
  static async getTodo(
    workspaceId: string,
    channelId: string,
    todoId: string
  ): Promise<Todo | null> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(
      db,
      getTodosCollectionPath(workspaceId, channelId),
      todoId
    );
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    } as Todo;
  }

  /**
   * 채널의 할 일 목록 조회
   */
  static async getChannelTodos(
    workspaceId: string,
    channelId: string,
    filterOptions?: TodoFilterOptions
  ): Promise<Todo[]> {
    if (!db) throw new Error('Firestore is not initialized');

    const todosRef = collection(
      db,
      getTodosCollectionPath(workspaceId, channelId)
    );

    let q = query(todosRef);

    // 필터 적용
    if (filterOptions) {
      if (filterOptions.filter === 'completed') {
        q = query(q, where('completed', '==', true));
      } else if (filterOptions.filter === 'incomplete') {
        q = query(q, where('completed', '==', false));
      }
      // 'my-todos'와 'overdue'는 클라이언트 측에서 필터링
    }

    // 정렬 적용
    const sortBy = filterOptions?.sortBy || 'createdAt';
    const sortOrder = filterOptions?.sortOrder || 'desc';

    if (sortBy === 'dueDate') {
      q = query(q, orderBy('dueDate', sortOrder));
    } else if (sortBy === 'createdAt') {
      q = query(q, orderBy('createdAt', sortOrder));
    } else if (sortBy === 'priority') {
      q = query(q, orderBy('priority', sortOrder));
    } else {
      q = query(q, orderBy('createdAt', sortOrder));
    }

    const querySnapshot = await getDocs(q);
    const todos: Todo[] = [];

    querySnapshot.forEach((doc) => {
      todos.push({
        id: doc.id,
        ...doc.data(),
      } as Todo);
    });

    // 클라이언트 측 필터링
    let filteredTodos = todos;

    if (filterOptions) {
      // 내 할 일 필터
      if (filterOptions.filter === 'my-todos' && filterOptions.searchQuery) {
        // searchQuery에 userId가 포함되어 있다고 가정
        const userId = filterOptions.searchQuery;
        filteredTodos = filteredTodos.filter((todo) =>
          todo.assigneeIds.includes(userId)
        );
      }

      // 지연된 할 일 필터
      if (filterOptions.filter === 'overdue') {
        const now = Timestamp.now();
        filteredTodos = filteredTodos.filter(
          (todo) =>
            !todo.completed &&
            todo.dueDate &&
            todo.dueDate.toMillis() < now.toMillis()
        );
      }

      // 검색 쿼리
      if (filterOptions.searchQuery) {
        const searchLower = filterOptions.searchQuery.toLowerCase();
        filteredTodos = filteredTodos.filter(
          (todo) =>
            todo.title.toLowerCase().includes(searchLower) ||
            (todo.description &&
              todo.description.toLowerCase().includes(searchLower))
        );
      }
    }

    return filteredTodos;
  }

  /**
   * 할 일 업데이트
   */
  static async updateTodo(
    workspaceId: string,
    channelId: string,
    todoId: string,
    data: UpdateTodoData,
    updatedBy: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(
      db,
      getTodosCollectionPath(workspaceId, channelId),
      todoId
    );

    const updateData: Partial<Todo> = {
      updatedAt: Timestamp.now(),
      updatedBy,
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.assigneeIds !== undefined)
      updateData.assigneeIds = data.assigneeIds;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;

    // dueDate 처리
    if (data.dueDate !== undefined) {
      if (data.dueDate === null) {
        updateData.dueDate = undefined;
      } else {
        updateData.dueDate =
          data.dueDate instanceof Date
            ? Timestamp.fromDate(data.dueDate)
            : data.dueDate;
      }
    }

    // 완료 상태 처리
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      if (data.completed) {
        updateData.completedAt = Timestamp.now();
        updateData.completedBy = updatedBy;
        
        // 완료 알림 (비동기)
        try {
          const todo = await this.getTodo(workspaceId, channelId, todoId);
          if (todo) {
            const users = await getAllUsersWithAuthInfo();
            const completedBy = users.find((u) => u.uid === updatedBy);
            if (completedBy) {
              TodoNotificationService.notifyTodoCompleted(
                todo,
                {
                  uid: completedBy.uid || '',
                  displayName: completedBy.displayName || completedBy.name || '',
                  photoURL: completedBy.photoURL || undefined,
                }
              ).catch((error) => {
                console.error('할 일 완료 알림 전송 실패:', error);
              });
            }
          }
        } catch (error) {
          console.error('할 일 완료 알림 처리 실패:', error);
        }
      } else {
        updateData.completedAt = undefined;
        updateData.completedBy = undefined;
      }
    }

    // 담당자 변경 알림 (비동기)
    if (data.assigneeIds !== undefined) {
      try {
        const todo = await this.getTodo(workspaceId, channelId, todoId);
        if (todo && data.assigneeIds.length > 0) {
          const users = await getAllUsersWithAuthInfo();
          const assignedBy = users.find((u) => u.uid === updatedBy);
          if (assignedBy) {
            TodoNotificationService.notifyTodoAssigned(
              { ...todo, assigneeIds: data.assigneeIds },
              data.assigneeIds,
              {
                uid: assignedBy.uid || '',
                displayName: assignedBy.displayName || assignedBy.name || '',
                photoURL: assignedBy.photoURL || undefined,
              }
            ).catch((error) => {
              console.error('할 일 할당 알림 전송 실패:', error);
            });
          }
        }
      } catch (error) {
        console.error('할 일 할당 알림 처리 실패:', error);
      }
    }

    // undefined 필드 제거
    const cleanedData = removeUndefinedFields(updateData);
    await updateDoc(docRef, cleanedData);
  }

  /**
   * 할 일 삭제
   */
  static async deleteTodo(
    workspaceId: string,
    channelId: string,
    todoId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const docRef = doc(
      db,
      getTodosCollectionPath(workspaceId, channelId),
      todoId
    );
    await deleteDoc(docRef);
  }

  /**
   * 할 일 완료 토글
   */
  static async toggleTodo(
    workspaceId: string,
    channelId: string,
    todoId: string,
    userId: string
  ): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized');

    const todo = await this.getTodo(workspaceId, channelId, todoId);
    if (!todo) {
      throw new Error('Todo not found');
    }

    await this.updateTodo(
      workspaceId,
      channelId,
      todoId,
      { completed: !todo.completed },
      userId
    );
  }

  /**
   * 할 일 통계 조회
   */
  static async getTodoStats(
    workspaceId: string,
    channelId: string,
    userId?: string
  ): Promise<TodoStats> {
    if (!db) throw new Error('Firestore is not initialized');

    const todos = await this.getChannelTodos(workspaceId, channelId);
    const now = Timestamp.now();

    const stats: TodoStats = {
      total: todos.length,
      completed: todos.filter((t) => t.completed).length,
      incomplete: todos.filter((t) => !t.completed).length,
      overdue: todos.filter(
        (t) =>
          !t.completed &&
          t.dueDate &&
          t.dueDate.toMillis() < now.toMillis()
      ).length,
      myTodos: userId
        ? todos.filter((t) => t.assigneeIds.includes(userId) && !t.completed)
            .length
        : 0,
    };

    return stats;
  }

  /**
   * 할 일 실시간 구독
   */
  static subscribeToChannelTodos(
    workspaceId: string,
    channelId: string,
    callback: (todos: Todo[]) => void,
    onError?: (error: Error) => void,
    filterOptions?: TodoFilterOptions
  ): () => void {
    if (!db) {
      const error = new Error('Firestore is not initialized');
      onError?.(error);
      return () => {};
    }

    const todosRef = collection(
      db,
      getTodosCollectionPath(workspaceId, channelId)
    );

    let q = query(todosRef);

    // 필터 적용
    if (filterOptions) {
      if (filterOptions.filter === 'completed') {
        q = query(q, where('completed', '==', true));
      } else if (filterOptions.filter === 'incomplete') {
        q = query(q, where('completed', '==', false));
      }
    }

    // 정렬 적용
    const sortBy = filterOptions?.sortBy || 'createdAt';
    const sortOrder = filterOptions?.sortOrder || 'desc';

    if (sortBy === 'dueDate') {
      q = query(q, orderBy('dueDate', sortOrder));
    } else if (sortBy === 'createdAt') {
      q = query(q, orderBy('createdAt', sortOrder));
    } else if (sortBy === 'priority') {
      q = query(q, orderBy('priority', sortOrder));
    } else {
      q = query(q, orderBy('createdAt', sortOrder));
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const todos: Todo[] = [];

        querySnapshot.forEach((doc) => {
          todos.push({
            id: doc.id,
            ...doc.data(),
          } as Todo);
        });

        // 클라이언트 측 필터링
        let filteredTodos = todos;

        if (filterOptions) {
          // 내 할 일 필터 (searchQuery에 userId가 포함된 경우)
          if (filterOptions.filter === 'my-todos' && filterOptions.searchQuery) {
            // searchQuery가 userId인 경우 (내 할 일 필터)
            // UUID 형식인지 확인 (간단한 체크)
            const isUserId = filterOptions.searchQuery.length > 20;
            if (isUserId) {
              const userId = filterOptions.searchQuery;
              filteredTodos = filteredTodos.filter((todo) =>
                todo.assigneeIds.includes(userId)
              );
            }
          }

          // 지연된 할 일 필터
          if (filterOptions.filter === 'overdue') {
            const now = Timestamp.now();
            filteredTodos = filteredTodos.filter(
              (todo) =>
                !todo.completed &&
                todo.dueDate &&
                todo.dueDate.toMillis() < now.toMillis()
            );
          }

          // 검색 쿼리
          if (filterOptions.searchQuery) {
            const searchLower = filterOptions.searchQuery.toLowerCase();
            filteredTodos = filteredTodos.filter(
              (todo) =>
                todo.title.toLowerCase().includes(searchLower) ||
                (todo.description &&
                  todo.description.toLowerCase().includes(searchLower))
            );
          }
        }

        callback(filteredTodos);
      },
      (error) => {
        onError?.(error);
      }
    );

    return unsubscribe;
  }

  /**
   * 사용자가 참여한 모든 워크스페이스의 할 일 조회
   */
  static async getAllTodos(
    userId: string,
    filterOptions?: TodoFilterOptions
  ): Promise<Todo[]> {
    if (!db) throw new Error('Firestore is not initialized');

    // 사용자가 참여한 워크스페이스 조회
    const workspacesRef = collection(db, 'workspaces');
    const workspacesSnapshot = await getDocs(workspacesRef);
    
    const allTodos: Todo[] = [];
    const now = Timestamp.now();

    // 각 워크스페이스의 채널별로 할 일 조회
    for (const workspaceDoc of workspacesSnapshot.docs) {
      const workspaceId = workspaceDoc.id;
      const workspaceData = workspaceDoc.data();
      
      // 사용자가 워크스페이스 멤버인지 확인
      const members = workspaceData.members || [];
      const isMember = members.some((m: any) => m.uid === userId);
      if (!isMember) continue;

      // 워크스페이스의 채널 목록 조회
      const channelsRef = collection(db, `workspaces/${workspaceId}/channels`);
      const channelsSnapshot = await getDocs(channelsRef);

      for (const channelDoc of channelsSnapshot.docs) {
        const channelId = channelDoc.id;
        
        // 채널의 할 일 조회
        const todosRef = collection(
          db,
          getTodosCollectionPath(workspaceId, channelId)
        );

        let q = query(todosRef);

        // 필터 적용
        if (filterOptions) {
          if (filterOptions.filter === 'completed') {
            q = query(q, where('completed', '==', true));
          } else if (filterOptions.filter === 'incomplete') {
            q = query(q, where('completed', '==', false));
          }
        }

        // 정렬 적용
        const sortBy = filterOptions?.sortBy || 'createdAt';
        const sortOrder = filterOptions?.sortOrder || 'desc';

        if (sortBy === 'dueDate') {
          q = query(q, orderBy('dueDate', sortOrder));
        } else if (sortBy === 'createdAt') {
          q = query(q, orderBy('createdAt', sortOrder));
        } else if (sortBy === 'priority') {
          q = query(q, orderBy('priority', sortOrder));
        } else {
          q = query(q, orderBy('createdAt', sortOrder));
        }

        try {
          const todosSnapshot = await getDocs(q);
          todosSnapshot.forEach((todoDoc) => {
            allTodos.push({
              id: todoDoc.id,
              ...todoDoc.data(),
            } as Todo);
          });
        } catch (error) {
          // 채널에 할 일 컬렉션이 없거나 인덱스가 없을 수 있음
          console.warn(`Failed to fetch todos for channel ${channelId}:`, error);
        }
      }
    }

    // 클라이언트 측 필터링
    let filteredTodos = allTodos;

    if (filterOptions) {
      // 내 할 일 필터
      if (filterOptions.filter === 'my-todos') {
        filteredTodos = filteredTodos.filter((todo) =>
          todo.assigneeIds.includes(userId)
        );
      }

      // 지연된 할 일 필터
      if (filterOptions.filter === 'overdue') {
        filteredTodos = filteredTodos.filter(
          (todo) =>
            !todo.completed &&
            todo.dueDate &&
            todo.dueDate.toMillis() < now.toMillis()
        );
      }

      // 검색 쿼리
      if (filterOptions.searchQuery && filterOptions.filter !== 'my-todos') {
        const searchLower = filterOptions.searchQuery.toLowerCase();
        filteredTodos = filteredTodos.filter(
          (todo) =>
            todo.title.toLowerCase().includes(searchLower) ||
            (todo.description &&
              todo.description.toLowerCase().includes(searchLower))
        );
      }
    }

    return filteredTodos;
  }

  /**
   * 모든 할 일 통계 조회
   */
  static async getAllTodoStats(userId: string): Promise<TodoStats> {
    if (!db) throw new Error('Firestore is not initialized');

    const todos = await this.getAllTodos(userId);
    const now = Timestamp.now();

    const stats: TodoStats = {
      total: todos.length,
      completed: todos.filter((t) => t.completed).length,
      incomplete: todos.filter((t) => !t.completed).length,
      overdue: todos.filter(
        (t) =>
          !t.completed &&
          t.dueDate &&
          t.dueDate.toMillis() < now.toMillis()
      ).length,
      myTodos: todos.filter((t) => t.assigneeIds.includes(userId) && !t.completed)
        .length,
    };

    return stats;
  }
}

