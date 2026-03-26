import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import CustomersPage from "./pages/CustomersPage";
import CustomerDetailPage from "./pages/CustomerDetailPage";
import CustomerGroupsPage from "./pages/CustomerGroupsPage";
import CustomerAgenciesPage from "./pages/CustomerAgenciesPage";
import Dashboard from "./pages/Dashboard";
import BoardCreatePage from "./pages/BoardCreatePage";
import BoardDetailPage from "./pages/BoardDetailPage";
import BoardListPage from "./pages/BoardListPage";
import EmployeesPage from "./pages/EmployeesPage";
import EmployeesLeavePage from "./pages/EmployeesLeavePage";
import EmployeesHrInfoPage from "./pages/EmployeesHrInfoPage";
import LoginPage from "./pages/LoginPage";
import MachineDetailPage from "./pages/MachineDetailPage";
import MachinesPage from "./pages/MachinesPage";
import MachineModelsPage from "./pages/MachineModelsPage";
import InventoryPage from "./pages/InventoryPage";
import TicketCreatePage from "./pages/TicketCreatePage";
import TicketDetailPage from "./pages/TicketDetailPage";
import TicketCategoriesPage from "./pages/TicketCategoriesPage";
import TicketsPage from "./pages/TicketsPage";
import AuditLogsPage from "./pages/AuditLogsPage";
function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;
  // 로그인 상태면 / 로 보냄
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* 로그인 */}
        <Route path="/login" element={<LoginRoute />} />

        {/* 보호된 영역 */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/customers/groups" element={<CustomerGroupsPage />} />
          <Route path="/customers/agencies" element={<CustomerAgenciesPage />} />
          <Route path="/machines" element={<MachinesPage />} />
          <Route path="/machines/models" element={<MachineModelsPage />} />
          <Route path="/machines/:id" element={<MachineDetailPage />} />
          <Route path="/inventories" element={<InventoryPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/new" element={<TicketCreatePage />} />
          <Route path="/tickets/categories" element={<TicketCategoriesPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/leave" element={<EmployeesLeavePage />} />
          <Route path="/employees/hr-info" element={<EmployeesHrInfoPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/boards/:type" element={<BoardListPage />} />
          <Route path="/boards/:type/new" element={<BoardCreatePage />} />
          <Route path="/boards/:type/posts/:id" element={<BoardDetailPage />} />
        </Route>

        {/* 그 외는 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
