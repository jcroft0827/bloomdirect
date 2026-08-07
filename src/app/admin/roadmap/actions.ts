"use server";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ROADMAP_COOKIE = "gbd-admin-roadmap-access";
const ROADMAP_COOKIE_MAX_AGE = 60 * 60 * 8;

function getRoadmapPassword() {
  const password = process.env.ADMIN_ROADMAP_PASSWORD;

  if (!password) {
    throw new Error(
      "ADMIN_ROADMAP_PASSWORD is not configured. Add it to your environment variables before using the roadmap page.",
    );
  }

  return password;
}

function createAccessToken(password: string) {
  return createHmac("sha256", password)
    .update("getbloomdirect-admin-roadmap-access-v1")
    .digest("hex");
}

export async function hasRoadmapAccess() {
  const password = getRoadmapPassword();
  const cookieStore = await cookies();
  const storedToken = cookieStore.get(ROADMAP_COOKIE)?.value;

  if (!storedToken) {
    return false;
  }

  const expectedToken = createAccessToken(password);
  const storedBuffer = Buffer.from(storedToken);
  const expectedBuffer = Buffer.from(expectedToken);

  if (storedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, expectedBuffer);
}

export async function unlockRoadmap(formData: FormData) {
  const submittedPassword = String(formData.get("password") ?? "");
  const configuredPassword = getRoadmapPassword();

  const submittedBuffer = Buffer.from(submittedPassword);
  const configuredBuffer = Buffer.from(configuredPassword);
  const passwordsMatch =
    submittedBuffer.length === configuredBuffer.length &&
    timingSafeEqual(submittedBuffer, configuredBuffer);

  if (!passwordsMatch) {
    redirect("/admin/roadmap?error=invalid-password");
  }

  const cookieStore = await cookies();

  cookieStore.set(ROADMAP_COOKIE, createAccessToken(configuredPassword), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin/roadmap",
    maxAge: ROADMAP_COOKIE_MAX_AGE,
  });

  redirect("/admin/roadmap");
}

export async function lockRoadmap() {
  const cookieStore = await cookies();
  cookieStore.delete(ROADMAP_COOKIE);
  redirect("/admin/roadmap");
}
