import { registerJobHandler } from "@/server/jobs";
import { processDocument } from "@/server/pipeline/run";
import { deliverWebhook } from "@/server/webhooks";
import { sendEmail, sendSms } from "@/server/notifications";

registerJobHandler("process_document", async (payload) => {
  await processDocument(String(payload.documentId), { restart: Boolean(payload.restart) });
});

registerJobHandler("deliver_webhook", async (payload) => {
  await deliverWebhook(payload);
});

registerJobHandler("send_email", async (payload) => {
  await sendEmail(payload as { to: string; subject: string; text: string });
});

registerJobHandler("send_sms", async (payload) => {
  await sendSms(payload as { to: string; message: string });
});
