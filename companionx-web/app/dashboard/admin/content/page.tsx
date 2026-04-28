"use client";

import { Eye, Newspaper, Trash } from "@phosphor-icons/react";
import api from "@/lib/axios";
import { AdminEmptyState, AdminPageShell, AdminStatusBadge, AdminTableSkeleton } from "../_components/admin-ui";
import { getCollection, useAdminResource } from "../_lib/use-admin-resource";

type AdminPost = {
  id: number;
  title: string;
  slug: string;
  status: string;
  author_name: string;
  view_count: number;
  created_at: string;
};

const emptyPosts: { data: AdminPost[] } = { data: [] };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function updatePost(postId: number, status: "draft" | "published") {
  await api.patch(`/api/admin/blogs/${postId}`, { status });
  window.location.reload();
}

async function deletePost(postId: number) {
  if (!window.confirm("Delete this post?")) return;
  await api.delete(`/api/admin/blogs/${postId}`);
  window.location.reload();
}

export default function AdminContentPage() {
  const { data, loading, error } = useAdminResource("/api/admin/blogs", emptyPosts);
  const posts = getCollection(data);

  return (
    <AdminPageShell eyebrow="" title="Content" description="Moderate Consultant's Corner articles before and after publication.">
      {error && <div className="mb-5 border border-amber-500/30 bg-amber-500/5 p-4 font-sans text-xs text-amber-700">{error}</div>}
      {loading ? <AdminTableSkeleton /> : posts.length === 0 ? <AdminEmptyState title="No posts found" message="Consultant content will appear here when the admin blogs API is connected." /> : (
        <div className="overflow-hidden border border-border bg-card">
          {posts.map((post) => (
            <div key={post.id} className="flex flex-col gap-4 border-b border-border p-5 last:border-b-0 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-3">
                <div className="flex size-10 items-center justify-center border border-primary/30 bg-primary/5 text-primary"><Newspaper size={18} /></div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-base font-semibold text-foreground">{post.title}</p>
                    <AdminStatusBadge tone={post.status === "published" ? "success" : "warning"}>{post.status}</AdminStatusBadge>
                  </div>
                  <p className="mt-1 font-sans text-xs text-muted-foreground">{post.author_name} · {formatDate(post.created_at)} · {post.view_count} views</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => updatePost(post.id, "published")} className="inline-flex items-center gap-2 border border-emerald-600 px-3 py-2 font-sans text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-600 hover:text-white"><Eye size={14} />Publish</button>
                <button onClick={() => updatePost(post.id, "draft")} className="border border-amber-600 px-3 py-2 font-sans text-xs font-medium text-amber-600 transition-colors hover:bg-amber-600 hover:text-white">Unpublish</button>
                <button onClick={() => deletePost(post.id)} className="inline-flex items-center gap-2 border border-rose-600 px-3 py-2 font-sans text-xs font-medium text-rose-600 transition-colors hover:bg-rose-600 hover:text-white"><Trash size={14} />Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
