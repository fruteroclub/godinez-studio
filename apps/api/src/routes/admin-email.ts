import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Resend, type CreateEmailOptions } from "resend";
import { requireServiceKey } from "../middleware/require-service-key";
import { logger } from "../lib/logger";

const app = new Hono();

app.use("*", requireServiceKey);

const DEFAULT_FROM = "Godínez.AI <invitaciones@godinez.ai>";

const sendSchema = z
  .object({
    to: z.string().email(),
    subject: z.string().min(1),
    html: z.string().min(1).optional(),
    text: z.string().min(1).optional(),
    from: z.string().min(1).optional(),
    replyTo: z.string().email().optional(),
  })
  .refine((v) => Boolean(v.html || v.text), {
    message: "At least one of 'html' or 'text' is required",
    path: ["html"],
  });

app.post("/send", zValidator("json", sendSchema), async (c) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.error("RESEND_API_KEY not configured");
    return c.json({ success: false, error: "Resend not configured" }, 503);
  }

  const body = c.req.valid("json");
  const from = body.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;
  const resend = new Resend(apiKey);

  const payload: CreateEmailOptions = {
    from,
    to: body.to,
    subject: body.subject,
    ...(body.html ? { html: body.html } : {}),
    ...(body.text ? { text: body.text } : {}),
    ...(body.replyTo ? { replyTo: body.replyTo } : {}),
  } as CreateEmailOptions;

  try {
    const { data, error } = await resend.emails.send(payload);

    if (error) {
      logger.error(
        { to: body.to, subject: body.subject, error: error.message },
        "admin email send failed",
      );
      return c.json({ success: false, error: error.message }, 502);
    }

    logger.info(
      { to: body.to, subject: body.subject, id: data?.id },
      "admin email sent",
    );
    return c.json({ success: true, id: data?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error(
      { to: body.to, subject: body.subject, error: message },
      "admin email send threw",
    );
    return c.json({ success: false, error: message }, 502);
  }
});

export default app;
