import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.functions";
import { sessionQueryKey } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery({
      queryKey: sessionQueryKey,
      queryFn: () => getSession(),
      staleTime: 30_000,
    });
    if (!session) throw redirect({ to: "/" });
    return { session };
  },
  component: Outlet,
});
