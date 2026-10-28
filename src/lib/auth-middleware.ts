import { createMiddleware } from "@tanstack/react-start";

/** Server functions using this require a signed-in user and receive it as `context.user`. */
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { getSessionUser } = await import("@/server/auth.server");
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized: please sign in again.");
  return next({ context: { user } });
});

/** Like requireAuth, but only Admins get through (Users are view only). */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireAuth])
  .server(async ({ next, context }) => {
    if (context.user.role !== "Admin") throw new Error("You have view-only access.");
    return next();
  });
