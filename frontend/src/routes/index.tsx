import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { CampaignDetailsPage } from "@/pages/Campaigns/CampaignDetailsPage";
import { CampaignListPage } from "@/pages/Campaigns/CampaignListPage";
import { CreateCampaignPage } from "@/pages/Campaigns/CreateCampaignPage";
import { DashboardPage } from "@/pages/Dashboard";
import { LoginPage } from "@/pages/Login";
import { NotFoundPage } from "@/pages/NotFound";
import { MyTasksPage } from "@/pages/Tasks/MyTasksPage";
import { TaskDetailsPage } from "@/pages/Tasks/TaskDetailsPage";
import { UnauthorizedPage } from "@/pages/Unauthorized";
import { UsersPage } from "@/pages/Users";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/campaigns" element={<CampaignListPage />} />
          <Route
            element={
              <RoleRoute
                roles={["ADMIN", "REQUESTER", "MARKETING_MANAGER"]}
              />
            }
          >
            <Route path="/campaigns/new" element={<CreateCampaignPage />} />
          </Route>
          <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />

          <Route
            element={
              <RoleRoute
                roles={[
                  "ADMIN",
                  "MARKETING_MANAGER",
                  "DESIGNER",
                  "CONTENT_CREATOR",
                  "SOCIAL_MEDIA",
                ]}
              />
            }
          >
            <Route path="/tasks" element={<MyTasksPage />} />
          </Route>
          <Route path="/tasks/:id" element={<TaskDetailsPage />} />

          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<RoleRoute roles={["ADMIN"]} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
