import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-b from-muted/40 to-background px-4">
      <Outlet />
    </div>
  );
}
