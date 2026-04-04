import axios from "axios";
import { bucket, requireGcs } from "./gcs.client";

export interface UploadResult {
  gcsUrl:    string;
  gcsBucket: string;
  gcsKey:    string;
}

export async function archiveRemoteUrl(
  remoteUrl: string,
  gcsKey: string,
  contentType: string,
): Promise<UploadResult> {
  const { bucket, baseUrl, gcsBucket } = requireGcs();
  const response = await axios.get<Buffer>(remoteUrl, { responseType: "arraybuffer" });
  const buffer   = Buffer.from(response.data);

  const file = bucket.file(gcsKey);
  await file.save(buffer, { contentType, resumable: false });

  return {
    gcsUrl:    `${baseUrl}/${gcsKey}`,
    gcsBucket,
    gcsKey,
  };
}

export async function uploadBuffer(
  buffer: Buffer,
  gcsKey: string,
  contentType: string,
): Promise<UploadResult> {
  const { bucket, baseUrl, gcsBucket } = requireGcs();
  const file = bucket.file(gcsKey);
  await file.save(buffer, { contentType, resumable: false });

  return {
    gcsUrl:    `${baseUrl}/${gcsKey}`,
    gcsBucket,
    gcsKey,
  };
}

export async function deleteGcsFile(gcsKey: string): Promise<void> {
  if (!bucket) return;
  await bucket.file(gcsKey).delete({ ignoreNotFound: true });
}

export async function deleteGcsFiles(gcsKeys: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(gcsKeys.filter((k): k is string => Boolean(k?.trim())))];
  await Promise.all(unique.map((k) => deleteGcsFile(k)));
}
