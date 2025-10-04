import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  salary: number;
  hireDate: Date;
  status: 'active' | 'inactive' | 'terminated';
  phoneNumber?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

interface EmployeesState {
  employees: Employee[];
  selectedEmployee: Employee | null;
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  filterDepartment: string;
  filterStatus: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
}

interface EmployeesActions {
  // CRUD Operations
  fetchEmployees: () => Promise<void>;
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  
  // Selection & Filtering
  selectEmployee: (employee: Employee | null) => void;
  setSearchTerm: (term: string) => void;
  setFilterDepartment: (department: string) => void;
  setFilterStatus: (status: string) => void;
  setCurrentPage: (page: number) => void;
  
  // State Management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Computed Values
  getFilteredEmployees: () => Employee[];
  getEmployeeById: (id: string) => Employee | undefined;
}

const initialState: EmployeesState = {
  employees: [],
  selectedEmployee: null,
  isLoading: false,
  error: null,
  searchTerm: '',
  filterDepartment: '',
  filterStatus: '',
  currentPage: 1,
  totalPages: 1,
  itemsPerPage: 10,
};

export const useEmployeesStore = create<EmployeesState & EmployeesActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // CRUD Operations
        fetchEmployees: async () => {
          set({ isLoading: true, error: null });
          try {
            // 실제 API 호출은 별도 서비스에서 처리
            console.log('Fetching employees...');
            
            // 임시 데이터 (실제로는 API에서 가져옴)
            const mockEmployees: Employee[] = [
              {
                id: '1',
                name: '김철수',
                email: 'kim.cs@company.com',
                position: '개발자',
                department: 'IT',
                salary: 5000000,
                hireDate: new Date('2023-01-15'),
                status: 'active',
                phoneNumber: '010-1234-5678',
              },
              {
                id: '2',
                name: '이영희',
                email: 'lee.yh@company.com',
                position: '디자이너',
                department: '디자인',
                salary: 4500000,
                hireDate: new Date('2023-03-20'),
                status: 'active',
                phoneNumber: '010-2345-6789',
              },
            ];
            
            set({ 
              employees: mockEmployees,
              totalPages: Math.ceil(mockEmployees.length / get().itemsPerPage),
              isLoading: false 
            });
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '직원 정보를 불러오는데 실패했습니다.',
              isLoading: false 
            });
          }
        },
        
        addEmployee: async (employeeData: Omit<Employee, 'id'>) => {
          set({ isLoading: true, error: null });
          try {
            const newEmployee: Employee = {
              ...employeeData,
              id: Date.now().toString(), // 임시 ID 생성
            };
            
            set((state) => ({
              employees: [...state.employees, newEmployee],
              totalPages: Math.ceil((state.employees.length + 1) / state.itemsPerPage),
              isLoading: false
            }));
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '직원 추가에 실패했습니다.',
              isLoading: false 
            });
          }
        },
        
        updateEmployee: async (id: string, employeeData: Partial<Employee>) => {
          set({ isLoading: true, error: null });
          try {
            set((state) => ({
              employees: state.employees.map(emp => 
                emp.id === id ? { ...emp, ...employeeData } : emp
              ),
              selectedEmployee: state.selectedEmployee?.id === id 
                ? { ...state.selectedEmployee, ...employeeData }
                : state.selectedEmployee,
              isLoading: false
            }));
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '직원 정보 수정에 실패했습니다.',
              isLoading: false 
            });
          }
        },
        
        deleteEmployee: async (id: string) => {
          set({ isLoading: true, error: null });
          try {
            set((state) => ({
              employees: state.employees.filter(emp => emp.id !== id),
              selectedEmployee: state.selectedEmployee?.id === id ? null : state.selectedEmployee,
              totalPages: Math.ceil((state.employees.length - 1) / state.itemsPerPage),
              isLoading: false
            }));
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : '직원 삭제에 실패했습니다.',
              isLoading: false 
            });
          }
        },
        
        // Selection & Filtering
        selectEmployee: (employee: Employee | null) => set({ selectedEmployee: employee }),
        
        setSearchTerm: (searchTerm: string) => set({ searchTerm, currentPage: 1 }),
        
        setFilterDepartment: (filterDepartment: string) => set({ filterDepartment, currentPage: 1 }),
        
        setFilterStatus: (filterStatus: string) => set({ filterStatus, currentPage: 1 }),
        
        setCurrentPage: (currentPage: number) => set({ currentPage }),
        
        // State Management
        setLoading: (isLoading: boolean) => set({ isLoading }),
        
        setError: (error: string | null) => set({ error }),
        
        clearError: () => set({ error: null }),
        
        // Computed Values
        getFilteredEmployees: () => {
          const { employees, searchTerm, filterDepartment, filterStatus } = get();
          
          return employees.filter(employee => {
            const matchesSearch = !searchTerm || 
              employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
              employee.position.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesDepartment = !filterDepartment || employee.department === filterDepartment;
            const matchesStatus = !filterStatus || employee.status === filterStatus;
            
            return matchesSearch && matchesDepartment && matchesStatus;
          });
        },
        
        getEmployeeById: (id: string) => {
          return get().employees.find(emp => emp.id === id);
        },
      }),
      {
        name: 'employees-store',
        partialize: (state) => ({ 
          // 민감하지 않은 설정만 persist
          searchTerm: state.searchTerm,
          filterDepartment: state.filterDepartment,
          filterStatus: state.filterStatus,
          currentPage: state.currentPage,
          itemsPerPage: state.itemsPerPage,
        }),
      }
    ),
    { name: 'employees-store' }
  )
);
