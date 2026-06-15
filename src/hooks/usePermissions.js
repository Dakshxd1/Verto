import { useAuth } from '../context/AuthContext';

export function usePermissions() {
  const { role, loading } = useAuth();

  return {
    role,
    loading,
    isAdmin:    role === 'admin',
    isManager:  role === 'manager',
    isEmployee: role === 'employee',
    isIntern:   role === 'intern',
    canSave:      role === 'admin' || role === 'manager',
    canEdit:      role === 'admin' || role === 'manager',
    canDelete:    role === 'admin' || role === 'manager',
    canExport:    role === 'admin' || role === 'manager',
    canImport:    role === 'admin' || role === 'manager',
    canApprove:   role === 'admin' || role === 'manager',
    canBulkUpload: role === 'admin' || role === 'manager',
  };
}

export function useRole() {
  const { role, loading } = useAuth();
  return { role, loading };
}
