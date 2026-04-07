import type { QueueName } from "../../queue/queues";

export type JobStatus = {
  jobId: string;
  queue: QueueName;
  name: string;
  state: string;
  progress: number | object;
  failedReason?: string;
};
