// lostnfound/page.js
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, PlusCircle, MapPin, Clock, Tag,
  MessageCircle, X, Send, Package, Image,
} from "lucide-react";
import toast from "react-hot-toast";
import useStore from "../../store/useStore";
import { createRequest, fetchLostnFoundItems } from "../../lib/apiRequests";
import styles from "../community.module.css";

const FILTERS = [
  { label: "All",   value: "" },
  { label: "Lost",  value: "lost" },
  { label: "Found", value: "found" },
];

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + "d ago";
  return new Date(dateStr).toLocaleDateString("en-PK", { month: "short", day: "numeric" });
}

function SkeletonGrid() {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.skeletonImage} />
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} style={{ animationDelay: "0.1s" }} />
            <div className={styles.skeletonLine} style={{ animationDelay: "0.15s" }} />
            <div className={styles.skeletonLine} style={{ animationDelay: "0.2s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LostnFoundPage() {
  const { user } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [postTypeFilter, setPostTypeFilter] = useState("");
  const [messageByItemId, setMessageByItemId] = useState({});
  const [openComposerId, setOpenComposerId] = useState("");
  const [requestingForId, setRequestingForId] = useState("");

  const onSendRequest = async (itemId) => {
    if (!user?._id) { toast.error("Log in to contact the poster"); return; }
    try {
      setRequestingForId(itemId);
      await createRequest("LostnFound", itemId, 1, String(messageByItemId[itemId] || "").trim());
      toast.success("Contact request sent.");
      setMessageByItemId((prev) => ({ ...prev, [itemId]: "" }));
      setOpenComposerId("");
    } catch (err) {
      toast.error(err?.message || "Could not send request");
    } finally {
      setRequestingForId("");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetchLostnFoundItems({ status: "open" });
        if (!cancelled) setItems(res?.data?.items || []);
      } catch (err) {
        if (!cancelled) { toast.error(err?.message || "Failed to load posts"); setItems([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const typeOk = !postTypeFilter || item.postType === postTypeFilter;
      const textOk = !q || [item.title, item.description, item.location, item.category]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
      return typeOk && textOk;
    });
  }, [items, search, postTypeFilter]);

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Lost &amp; Found</h1>
            <p className={styles.pageSubtitle}>Post and discover lost or found items around campus.</p>
          </div>
          {user && (
            <Link href="/lostnfound/create" className={styles.btnPrimary}>
              <PlusCircle size={16} /> New Post
            </Link>
          )}
        </div>

        <div className={styles.filterBar}>
          <div className={styles.filterRow}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by title, location, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.pillGroup} style={{ marginTop: "0.75rem" }}>
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                className={styles.pill + (postTypeFilter === value ? " " + styles.pillActive : "")}
                onClick={() => setPostTypeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!loading && (
          <p className={styles.resultsCount}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            {postTypeFilter ? " · " + postTypeFilter : ""}
          </p>
        )}

        {loading && <SkeletonGrid />}

        {!loading && (
          <div className={styles.grid}>
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><Package size={48} /></div>
                <p className={styles.emptyTitle}>No posts yet</p>
                <p className={styles.emptyText}>
                  {postTypeFilter ? "No " + postTypeFilter + " items. Try another filter." : "Be the first to post a lost or found item."}
                </p>
                {user && (
                  <Link href="/lostnfound/create" className={styles.btnPrimary}>
                    <PlusCircle size={16} /> New Post
                  </Link>
                )}
              </div>
            ) : (
              filtered.map((item) => {
                const img = item.images?.[0];
                const posterName = item.owner?.name || "Campus member";
                const initials = getInitials(posterName);
                const isOwn = user && String(user._id) === String(item.owner?._id);
                const composerOpen = openComposerId === item._id;
                const isLost = item.postType === "lost";
                return (
                  <div key={item._id} className={styles.card} style={{ textDecoration: "none" }}>
                    <div className={styles.cardImageWrap}>
                      {img ? (
                        <img src={img} alt={item.title} className={styles.cardImage} />
                      ) : (
                        <div className={styles.cardImagePlaceholder + " " + styles.imgFallbackDefault}>
                          <Image size={28} />
                          <span>No image</span>
                        </div>
                      )}
                      <span className={
                        styles.cardBadge + " " +
                        (isLost ? styles.cardBadgeSale : styles.cardBadgeFree)
                      }>
                        <Tag size={10} /> {isLost ? "Lost" : "Found"}
                      </span>
                    </div>

                    <div className={styles.cardBody}>
                      <p className={styles.cardCategory}>
                        {item.category || "General"}
                      </p>
                      <Link href={"/lostnfound/" + item._id} className={styles.cardTitle} style={{ display: "block", textDecoration: "none" }}>
                        {item.title}
                      </Link>
                      {item.description && (
                        <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", margin: "0.2rem 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {item.description}
                        </p>
                      )}

                      <div className={styles.ownerRow}>
                        <div className={styles.ownerAvatar}>{initials}</div>
                        <span className={styles.ownerName}>{posterName}</span>
                        <span className={styles.feedTime} style={{ marginLeft: "auto" }}>
                          <Clock size={11} /> {relativeTime(item.createdAt)}
                        </span>
                      </div>

                      {item.location && (
                        <div className={styles.cardMeta}>
                          <MapPin size={12} /> {item.location}
                        </div>
                      )}

                      {composerOpen ? (
                        <div className={styles.messageComposer} style={{ marginTop: "0.6rem" }}>
                          <textarea
                            className={styles.messageTextarea}
                            rows={2}
                            placeholder={isLost ? "I may have found this..." : "This could be mine..."}
                            value={messageByItemId[item._id] || ""}
                            onChange={(e) => setMessageByItemId((prev) => ({ ...prev, [item._id]: e.target.value }))}
                          />
                          <div className={styles.messageActions}>
                            <button
                              type="button"
                              className={styles.cardBtn}
                              style={{ flex: "none", padding: "0.45rem 0.9rem", fontSize: "0.83rem" }}
                              disabled={requestingForId === item._id}
                              onClick={() => onSendRequest(item._id)}
                            >
                              <Send size={13} />
                              {requestingForId === item._id ? "Sending..." : "Send"}
                            </button>
                            <button
                              type="button"
                              className={styles.cardBtnOutline}
                              style={{ flex: "none", padding: "0.45rem 0.7rem" }}
                              onClick={() => setOpenComposerId("")}
                              disabled={requestingForId === item._id}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.cardActions}>
                          {user && !isOwn ? (
                            <button
                              type="button"
                              className={styles.cardBtn}
                              onClick={() => setOpenComposerId(item._id)}
                            >
                              <MessageCircle size={14} />
                              {isLost ? "I Found It" : "Is This Mine?"}
                            </button>
                          ) : !user ? (
                            <Link href="/login" className={styles.cardBtn}>
                              Log in to respond
                            </Link>
                          ) : (
                            <Link href={"/lostnfound/" + item._id} className={styles.cardBtn}>
                              View Post
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
