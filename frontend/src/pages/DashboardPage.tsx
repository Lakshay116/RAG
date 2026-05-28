import { Card } from "../components/Card";
import { useAuth } from "../auth/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="stack">
      <Card title="Account">
        <p>Email: <b>{user?.email}</b></p>
        <p>Tenant: <b>{user?.tenantId}</b></p>
        <p>Role: <b>{user?.role}</b></p>
      </Card>
    </div>
  );
}
