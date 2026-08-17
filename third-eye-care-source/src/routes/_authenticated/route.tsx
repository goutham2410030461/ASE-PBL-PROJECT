import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { waitForSession } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const session = await waitForSession();
    if (!session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});