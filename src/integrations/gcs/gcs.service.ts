import axios from "axios";
import { requireGcs } from "./gcs.client";

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
  await file.makePublic();

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
  await file.makePublic();

  return {
    gcsUrl:    `${baseUrl}/${gcsKey}`,
    gcsBucket,
    gcsKey,
  };
}

export async function deleteGcsFile(gcsKey: string): Promise<void> {
  const { bucket } = requireGcs();
  await bucket.file(gcsKey).delete({ ignoreNotFound: true });
}
