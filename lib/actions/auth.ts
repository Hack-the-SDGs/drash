"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/drasl/auth";
import { DraslAPIError } from "@/lib/drasl/client";

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "Username and password are required" };
  }

  try {
    const user = await login({ username, password });

    if (user.role === "root" || user.role === "admin") {
      redirect("/en/admin/users");
    } else {
      redirect("/en/profile");
    }
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
