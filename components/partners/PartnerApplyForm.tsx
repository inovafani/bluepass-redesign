"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import Field from "@/components/auth/Field";
import Notice, { type NoticeTone } from "@/components/auth/Notice";
import PhoneField from "@/components/auth/PhoneField";
import Button from "@/components/ui/Button";
import { partnerCategoryOptions } from "@/lib/partners";

/**
 * The partner half of `/api/signup` (`roles: ["OPERATOR", "PARTNER"]` is a shared endpoint;
 * this page only ever submits `["PARTNER"]` — the operator side has its own funnel through
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
  const categoryFieldId = useId();
  const [name, setName] = useState(defaultName);
  const [phone, setPhone] = useState(defaultPhone);
  const [partnerCategory, setPartnerCategory] = useState(partnerCategoryOptions[0].value);
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
          partnerCategory,
          roles: ["PARTNER"],
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
      <label className="afield" htmlFor={categoryFieldId}>
        <span className="afield__top">
          <span className="ds-micro afield__label">What best describes you?</span>
        </span>
        <span className="afield__well">
          <select
            id={categoryFieldId}
            className="afield__input"
            value={partnerCategory}
            onChange={(e) => setPartnerCategory(e.target.value)}
            disabled={busy}
          >
            {partnerCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </label>
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
