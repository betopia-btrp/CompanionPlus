"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";

type ResourceState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
};

export function useAdminResource<T>(path: string, fallback: T) {
  const [state, setState] = useState<ResourceState<T>>({
    data: fallback,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      setState((current) => ({ ...current, loading: true, error: null }));
      api
        .get(path)
        .then((res) => {
          if (active) setState({ data: res.data as T, loading: false, error: null });
        })
        .catch(() => {
          if (active) {
            setState({
              data: fallback,
              loading: false,
              error: "Admin API is not available yet for this page.",
            });
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [path, fallback]);

  return state;
}

export function getCollection<T>(payload: T[] | { data?: T[]; items?: T[] }) {
  if (Array.isArray(payload)) return payload;
  return payload.data ?? payload.items ?? [];
}
