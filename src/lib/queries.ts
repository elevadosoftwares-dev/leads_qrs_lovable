import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession } from "@/lib/auth.functions";
import { getMasters, listMailSettings } from "@/lib/masters.functions";
import { getQuotation, listQuotations } from "@/lib/quotations.functions";
import { listUsers } from "@/lib/users.functions";

export const sessionQueryKey = ["session"] as const;

export function useSession() {
  const { data } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: () => getSession(),
    staleTime: 60_000,
  });
  return { session: data ?? null, isAdmin: data?.role === "Admin" };
}

const emptyMasters = { companies: [], clients: [], projects: [], bdms: [], preparers: [] };

export function useMasters() {
  return useQuery({ queryKey: ["masters"], queryFn: () => getMasters() }).data ?? emptyMasters;
}

export function useQuotations() {
  return useQuery({ queryKey: ["quotations"], queryFn: () => listQuotations() });
}

export function useQuotation(id: string) {
  return useQuery({ queryKey: ["quotations", id], queryFn: () => getQuotation({ data: { id } }) });
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => listUsers() }).data ?? [];
}

export function useMailSettings() {
  return useQuery({ queryKey: ["mail"], queryFn: () => listMailSettings() }).data ?? [];
}

/** Runs a server call, refreshes the given queries, and shows any error in an alert. */
export function useAction() {
  const queryClient = useQueryClient();
  return async <T>(
    call: () => Promise<T>,
    ...refresh: string[]
  ): Promise<{ ok: true; value: T } | { ok: false }> => {
    try {
      const value = await call();
      await Promise.all(refresh.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
      return { ok: true, value };
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
      return { ok: false };
    }
  };
}
