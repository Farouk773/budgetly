import { randomUUID } from "crypto";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "payslips");

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionForMimeType(mimeType: string): string | null {
  return EXTENSION_BY_MIME[mimeType] ?? null;
}

export async function savePayslipFile(
  userId: string,
  storedName: string,
  data: Buffer
): Promise<void> {
  const dir = path.join(STORAGE_ROOT, userId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, storedName), data);
}

export async function readPayslipFile(
  userId: string,
  storedName: string
): Promise<Buffer> {
  return readFile(path.join(STORAGE_ROOT, userId, storedName));
}

export async function deletePayslipFile(
  userId: string,
  storedName: string
): Promise<void> {
  await unlink(path.join(STORAGE_ROOT, userId, storedName)).catch(() => {});
}

export function generateStoredName(mimeType: string): string {
  return `${randomUUID()}.${extensionForMimeType(mimeType)}`;
}
