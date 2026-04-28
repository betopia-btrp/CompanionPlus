"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Plus, Trash, PencilSimple } from "@phosphor-icons/react";
import { Save, LoaderCircle } from "lucide-react";

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: "draft" | "published";
  view_count: number;
  created_at: string;
  updated_at: string;
};

export default function ConsultantsCornerPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    cover_image_url: "",
    status: "published" as "draft" | "published",
  });

  const fetchPosts = async () => {
    try {
      const res = await api.get("/api/consultant/blogs/drafts");
      setPosts(res.data);
    } catch (err) {
      console.error("Failed to fetch posts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchPosts();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const openEditor = (post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setForm({
        title: post.title,
        content: "",
        excerpt: post.excerpt ?? "",
        cover_image_url: post.cover_image_url ?? "",
        status: post.status,
      });
      api.get(`/api/blogs/${post.slug}`).then((res) => {
        setForm((f) => ({ ...f, content: res.data.content ?? "" }));
      });
    } else {
      setEditingPost(null);
      setForm({
        title: "",
        content: "",
        excerpt: "",
        cover_image_url: "",
        status: "published",
      });
    }
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingPost(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);

    try {
      if (editingPost) {
        await api.put(`/api/consultant/blogs/${editingPost.id}`, {
          title: form.title,
          content: form.content,
          excerpt: form.excerpt || null,
          cover_image_url: form.cover_image_url || null,
          status: form.status,
        });
      } else {
        await api.post("/api/consultant/blogs", {
          title: form.title,
          content: form.content,
          excerpt: form.excerpt || null,
          cover_image_url: form.cover_image_url || null,
          status: form.status,
        });
      }
      closeEditor();
      await fetchPosts();
    } catch (err) {
      console.error("Failed to save", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this post?")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/consultant/blogs/${id}`);
      await fetchPosts();
    } catch (err) {
      console.error("Failed to delete", err);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-4xl px-8 py-10">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-xl font-semibold text-foreground">
                Consultant&apos;s Corner
              </h1>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                Share your insights with the community
              </p>
            </div>
            <button
              onClick={() => openEditor()}
              className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 font-sans text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus size={16} weight="bold" />
              New Post
            </button>
          </div>
        </header>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse border border-border bg-muted"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="border border-border bg-card p-8 text-center">
            <p className="font-sans text-sm text-muted-foreground">
              No posts yet. Start writing your first blog post!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group flex items-center justify-between border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-sans text-[10px] font-medium uppercase tracking-wider ${
                        post.status === "published"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {post.status}
                    </span>
                    <span className="text-border">•</span>
                    <span className="font-sans text-[10px] text-muted-foreground">
                      {formatDate(post.created_at)}
                    </span>
                    <span className="text-border">•</span>
                    <span className="font-sans text-[10px] text-muted-foreground">
                      {post.view_count} views
                    </span>
                  </div>
                  <h3 className="font-heading text-[15px] font-semibold text-foreground truncate">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-1 font-sans text-[13px] text-muted-foreground truncate">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => openEditor(post)}
                    className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <PencilSimple size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deleting === post.id}
                    className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-rose-500"
                  >
                    {deleting === post.id ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Trash size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-border bg-card">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-foreground">
                {editingPost ? "Edit Post" : "New Post"}
              </h2>
              <button
                onClick={closeEditor}
                className="font-sans text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Your post title"
                  className="mt-2 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Content
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                  rows={12}
                  placeholder="Write your thoughts..."
                  className="mt-2 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Excerpt (optional)
                  </label>
                  <input
                    value={form.excerpt}
                    onChange={(e) =>
                      setForm({ ...form, excerpt: e.target.value })
                    }
                    placeholder="Short summary..."
                    className="mt-2 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cover Image URL (optional)
                  </label>
                  <input
                    value={form.cover_image_url}
                    onChange={(e) =>
                      setForm({ ...form, cover_image_url: e.target.value })
                    }
                    placeholder="https://..."
                    className="mt-2 w-full border border-border bg-background px-4 py-3 font-sans text-sm text-foreground outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="font-sans text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, status: "draft" })}
                    className={`px-4 py-2 font-sans text-sm transition-colors ${
                      form.status === "draft"
                        ? "border border-primary bg-primary/10 text-primary"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, status: "published" })}
                    className={`px-4 py-2 font-sans text-sm transition-colors ${
                      form.status === "published"
                        ? "border border-primary bg-primary/10 text-primary"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Publish Now
                  </button>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-card px-6 py-4">
              <button
                type="button"
                onClick={closeEditor}
                className="font-sans text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.content.trim()}
                className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 font-sans text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving ? "Saving..." : "Save Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
