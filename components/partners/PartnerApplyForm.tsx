"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Field from "@/components/auth/Field";
import Notice, { type NoticeTone } from "@/components/auth/Notice";
import PhoneField from "@/components/auth/PhoneField";
import Button from "@/components/ui/Button";

/**
 * The creator half of `/api/signup` (`roles: ["OPERATOR", "CREATOR"]` is a shared endpoint;
 * this page only ever submits `["CREATOR"]` — the operator side has its own funnel through
 * `/admin/operators/new`, filed by Bluepass staff, not self-service).
 */
export default function PartnerApplyForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);

  const valid = name.trim().length >= 2 && phone.trim().length >= 6;

  const onSubmit = async () => {
    setBusy(true);
    setNotice(null);

    let res: Response;
    try {
      res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          instagramUrl: instagramUrl.trim() || undefined,
          youtubeUrl: youtubeUrl.trim() || undefined,
          tiktokUrl: tiktokUrl.trim() || undefined,
          roles: ["CREATOR"],
        }),
      });
    } catch {
      setBusy(false);
      setNotice({ tone: "error", text: "Can’t reach Bluepass right now. Check your connection." });
      return;
    }

    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setNotice({
        tone: "error",
        text: typeof data?.error === "string" ? data.error : "Something went wrong. Please try again.",
      });
      return;
    }

    router.refresh();
  };

  return (
    <>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <Field
        label="Full name"
        value={name}
        onChange={setName}
        placeholder="Your name"
        autoComplete="name"
        required
        disabled={busy}
      />
      <PhoneField
        label="WhatsApp number"
        value={phone}
        onChange={setPhone}
        hint="How Bluepass reaches you"
        required
        disabled={busy}
      />
      <Field
        label="Instagram"
        value={instagramUrl}
        onChange={setInstagramUrl}
        placeholder="@yourname or full URL"
        autoComplete="off"
        disabled={busy}
      />
      <Field
        label="YouTube"
        value={youtubeUrl}
        onChange={setYoutubeUrl}
        placeholder="Channel URL"
        autoComplete="off"
        disabled={busy}
      />
      <Field
        label="TikTok"
        value={tiktokUrl}
        onChange={setTiktokUrl}
        placeholder="@yourname or full URL"
        autoComplete="off"
        disabled={busy}
      />

      <div className="aactions">
        <Button variant="primary" large magnetic={false} onClick={onSubmit} disabled={busy || !valid}>
          {busy ? "Submitting…" : "Claim my 5% founding link"}
        </Button>
        {!valid && !busy ? (
          <span className="ds-micro aactions__hint">Name and WhatsApp number are required.</span>
        ) : null}
      </div>

      <p className="ds-micro aterms">
        No sales call. An admin reviews this and your tracked link goes live once it's approved.
      </p>
    </>
  );
}
