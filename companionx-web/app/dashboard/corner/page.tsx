"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import {
  ArrowLeft,
  Heart,
  Lightning,
  Star,
} from "@phosphor-icons/react";
import { ThumbsUp, LoaderCircle } from "lucide-react";

type Author = {
  id: number;
  first_name: string;
  last_name: string;
};

type BlogPost = {
  id: number;
  title: string;
  slug: string;
  content?: string;
  excerpt: string | null;
  cover_image_url: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  author: Author;
  reaction_counts: {
    like: number;
    love: number;
    insightful: number;
    helpful: number;
  };
  user_reaction: string | null;
};

type PaginatedResponse = {
  data: BlogPost[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

const reactionIcons: Record<string, React.ReactNode> = {
  like: <ThumbsUp size={14} />,
  love: <Heart size={14} />,
  insightful: <Lightning size={14} />,
  helpful: <Star size={14} />,
};

const reactionLabels: Record<string, string> = {
  like: "Like",
  love: "Love",
  insightful: "Insightful",
  helpful: "Helpful",
};

export default function BlogsPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [reacting, setReacting] = useState<{ postId: number; type: string } | null>(null);
  const [page, setPage] = useState(1);

  const fetchBlogs = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/blogs?page=${pageNum}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch blogs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchBlogs(page);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [page]);

  const openPost = async (post: BlogPost) => {
    setPostLoading(true);
    setSelectedPost(null);
    try {
      const res = await api.get(`/api/blogs/${post.slug}`);
      setSelectedPost(res.data);
    } catch (err) {
      console.error("Failed to fetch post", err);
    } finally {
      setPostLoading(false);
    }
  };

  const handleReaction = async (postId: number, reactionType: string) => {
    setReacting({ postId, type: reactionType });
    try {
      const post = selectedPost?.id === postId ? selectedPost : data?.data.find(p => p.id === postId);
      if (!post) return;
      const type = reactionType as keyof typeof post.reaction_counts;

      if (post.user_reaction === type) {
        await api.delete(`/api/blogs/${postId}/react`);
        if (selectedPost?.id === postId) {
          setSelectedPost({
            ...selectedPost,
            user_reaction: null,
            reaction_counts: {
              ...selectedPost.reaction_counts,
              [type]: Math.max(0, selectedPost.reaction_counts[type] - 1),
            },
          });
        }
      } else {
        await api.post(`/api/blogs/${postId}/react`, { reaction_type: type });
        if (selectedPost?.id === postId) {
          const prevType = selectedPost.user_reaction as string | null;
          setSelectedPost({
            ...selectedPost,
            user_reaction: type,
            reaction_counts: {
              ...selectedPost.reaction_counts,
              [type]: selectedPost.reaction_counts[type] + 1,
              ...(prevType ? { [prevType]: Math.max(0, selectedPost.reaction_counts[prevType as keyof typeof selectedPost.reaction_counts] - 1) } : {}),
            },
          });
        }
      }
      if (data) {
        setData({
          ...data,
          data: data.data.map((p) => {
            if (p.id !== postId) return p;
            if (p.user_reaction === type) {
              return { ...p, user_reaction: null, reaction_counts: { ...p.reaction_counts, [type]: Math.max(0, p.reaction_counts[type] - 1) } };
            }
            const prevType = p.user_reaction as string | null;
            return {
              ...p,
              user_reaction: type,
              reaction_counts: {
                ...p.reaction_counts,
                [type]: p.reaction_counts[type] + 1,
                ...(prevType ? { [prevType]: Math.max(0, p.reaction_counts[prevType as keyof typeof p.reaction_counts] - 1) } : {}),
              },
            };
          }),
        });
      }
    } catch (err) {
      console.error("Failed to react", err);
    } finally {
      setReacting(null);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalReactions = (post: BlogPost) => {
    return Object.values(post.reaction_counts).reduce((a, b) => a + b, 0);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="mx-auto max-w-4xl px-8 py-10">
        <header className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 font-sans text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
          <p className="font-sans text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Insights
          </p>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Consultant&apos;s Corner
          </h1>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            Read thoughts and advice from our consultants
          </p>
        </header>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse border border-border bg-muted" />
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="border border-border bg-card p-8 text-center">
            <p className="font-sans text-sm text-muted-foreground">
              No posts available yet. Check back later!
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {data?.data.map((post) => (
                <button
                  key={post.id}
                  onClick={() => openPost(post)}
                  className="w-full text-left group border border-border bg-card p-5 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-sans text-[10px] text-muted-foreground">
                          {post.author.first_name} {post.author.last_name}
                        </span>
                        <span className="text-border">•</span>
                        <span className="font-sans text-[10px] text-muted-foreground">
                          {formatDate(post.created_at)}
                        </span>
                      </div>
                      <h3 className="font-heading text-[16px] font-semibold text-foreground group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="mt-2 font-sans text-[14px] text-muted-foreground line-clamp-2">
                          {post.excerpt}
                        </p>
                      )}
                    </div>
                    {post.cover_image_url && (
                      <img
                        src={post.cover_image_url}
                        alt=""
                        className="w-20 h-20 object-cover rounded border border-border"
                      />
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-muted-foreground">
                    <span className="font-sans text-[11px]">
                      {post.view_count} views
                    </span>
                    <span className="font-sans text-[11px]">
                      {totalReactions(post)} reactions
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {data && data.last_page > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 font-sans text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  Previous
                </button>
                <span className="font-sans text-sm text-muted-foreground">
                  Page {page} of {data.last_page}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(data.last_page, p + 1))}
                  disabled={page === data.last_page}
                  className="px-3 py-1.5 font-sans text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border bg-card">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <button
                onClick={() => setSelectedPost(null)}
                className="font-sans text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to list
              </button>
            </div>

            {postLoading ? (
              <div className="p-8 flex items-center justify-center">
                <LoaderCircle size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="p-6">
                  <div className="mb-4">
                    <span className="font-sans text-[10px] text-muted-foreground">
                      {selectedPost.author.first_name} {selectedPost.author.last_name} •{" "}
                      {formatDate(selectedPost.created_at)}
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl font-semibold text-foreground">
                    {selectedPost.title}
                  </h2>
                  {selectedPost.cover_image_url && (
                    <img
                      src={selectedPost.cover_image_url}
                      alt=""
                      className="mt-4 w-full h-48 object-cover rounded border border-border"
                    />
                  )}
                  <div className="mt-6 font-sans text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                    {selectedPost.content}
                  </div>
                </div>

                <div className="border-t border-border px-6 py-4">
                  <p className="font-sans text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    React to this post
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(reactionIcons).map(([type, icon]) => (
                      <button
                        key={type}
                        onClick={() => handleReaction(selectedPost.id, type)}
                        disabled={reacting?.postId === selectedPost.id}
                        className={`flex items-center gap-2 px-3 py-2 font-sans text-sm transition-colors ${
                          selectedPost.user_reaction === type
                            ? "border border-primary bg-primary/10 text-primary"
                            : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                        }`}
                      >
                        {icon}
                        <span>{reactionLabels[type]}</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedPost.reaction_counts[type as keyof typeof selectedPost.reaction_counts]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
