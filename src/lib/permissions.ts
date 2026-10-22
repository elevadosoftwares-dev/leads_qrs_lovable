export type Role = "Admin" | "User";
export type Status = "Pending" | "Successful" | "Failed";

export const canDelete = (role: Role | undefined) => role === "Admin";
export const canEdit = (role: Role | undefined) => role === "Admin";
