"use client";

import { useState, useTransition } from "react";
import Notice from "@/components/auth/Notice";
import { deleteBlogCategoryAction, saveBlogCategoryAction, type BlogActionState } from "@/app/admin/blog/actions";
import type { BlogCategoryRow } from "@/lib/services/blog/posts";

/**
 * Categories, edited in place.
 *
 * Each one is a public archive page — /blog/category/<slug> — so the description is not decoration:
 * it becomes that page's meta description, and an archive with nothing but a heading on it is a
 * thin page Google will happily ignore.
 */
export default function CategoryManager({ categories }: { categories: BlogCategoryRow[] }) {
  const [state, setState] = useState<BlogActionState>({ status: "idle" });
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (id: string | null, formData: FormData) => {
    startTransition(async () => {
      const result = await saveBlogCategoryAction(id, formData);
      setState(result);
      if (result.status === "saved") setEditing(null);
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await deleteBlogCategoryAction(id);
      setState(result);
      setConfirming(null);
    });
  };

  return (
    <div className="bpc">
      {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      {state.status === "saved" ? <Notice tone="success">{state.message}</Notice> : null}

      <form
        className="bpc-new"
        action={(formData) => save(null, formData)}
        key={state.status === "saved" ? state.id : "new"}
      >
        <div className="bpc-new__fields">
          <label className="bpe-field">
            <span className="ds-micro afield__label">Name</span>
            <input className="bpe-input" name="name" placeholder="e.g. Diving Indonesia" required maxLength={80} />
          </label>
          <label className="bpe-field bpc-new__desc">
            <span className="ds-micro afield__label">Description</span>
            <input
              className="bpe-input"
              name="description"
              placeholder="One line — it becomes the archive page's meta description."
              maxLength={300}
            />
          </label>
          <label className="bpe-field bpc-new__pos">
            <span className="ds-micro afield__label">Order</span>
            <input className="bpe-input" name="position" type="number" defaultValue={categories.length} min={0} max={999} />
          </label>
        </div>
        <button type="submit" className="bpe__btn bpe__btn--primary" disabled={pending}>
          Add category
        </button>
      </form>

      {categories.length === 0 ? (
        <div className="adm-card adm-empty">
          <p className="ds-body-sm adm-empty__body">
            No categories yet. They are optional — but each one is another page of yours in the index.
          </p>
        </div>
      ) : (
        <ul className="bpc__list">
          {categories.map((category) => (
            <li key={category.id} className="bpc-row">
              {editing === category.id ? (
                <form className="bpc-row__form" action={(formData) => save(category.id, formData)}>
                  <input className="bpe-input" name="name" defaultValue={category.name} required maxLength={80} />
                  <input
                    className="bpe-input"
                    name="description"
                    defaultValue={category.description ?? ""}
                    placeholder="Description"
                    maxLength={300}
                  />
                  <input
                    className="bpe-input bpc-row__pos"
                    name="position"
                    type="number"
                    defaultValue={category.position}
                    min={0}
                    max={999}
                  />
                  <div className="bpc-row__actions">
                    <button type="button" className="bpe__btn" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="bpe__btn bpe__btn--primary" disabled={pending}>
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="bpc-row__body">
                    <span className="ds-body-lg bpc-row__name">{category.name}</span>
                    <span className="ds-micro bpc-row__slug">/blog/category/{category.slug}</span>
                    {category.description ? (
                      <span className="ds-micro bpc-row__desc">{category.description}</span>
                    ) : (
                      <span className="ds-micro bpc-row__desc bpc-row__desc--missing">
                        No description — the archive page will be thin.
                      </span>
                    )}
                  </div>

                  <span className="ds-micro bpc-row__count">
                    {category.publishedCount} live
                    {category.postCount !== category.publishedCount
                      ? ` · ${category.postCount - category.publishedCount} draft`
                      : ""}
                  </span>

                  <div className="bpc-row__actions">
                    {confirming === category.id ? (
                      <>
                        <span className="ds-micro bpc-row__warn">Articles stay, unfiled.</span>
                        <button type="button" className="bpe__btn" onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="bpe__btn bpe__btn--danger"
                          onClick={() => remove(category.id)}
                          disabled={pending}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="ds-micro bpc-row__action" onClick={() => setEditing(category.id)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="ds-micro bpc-row__action"
                          onClick={() => setConfirming(category.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
