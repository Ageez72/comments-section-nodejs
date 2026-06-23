const API_BASE = "/api/comments";
const CURRENT_USER_AVATAR = "https://i.pravatar.cc/64?img=68";

const commentsEl = document.querySelector(".comments");
let comments = [];

const icons = {
  upvote: `<svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true"><path d="M10.5 5.5L5.5 0.5L0.5 5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  downvote: `<svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true"><path d="M0.5 5.5L5.5 10.5L10.5 5.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  reply: `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M8.5 2.5L3.5 7.5L8.5 12.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  delete: `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M1.5 3.5H12.5M5.5 3.5V2.5C5.5 2.22 5.72 2 6 2H8C8.28 2 8.5 2.22 8.5 2.5V3.5M11.5 3.5V11.5C11.5 11.78 11.28 12 11 12H3C2.72 12 2.5 11.78 2.5 11.5V3.5H11.5Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  edit: `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M9.5 2.5L11.5 4.5L4.5 11.5H2.5V9.5L9.5 2.5Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];

  for (const { label, seconds: s } of intervals) {
    const count = Math.floor(seconds / s);
    if (count >= 1) {
      return `${count} ${label}${count > 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
}

function formatBody(content) {
  return content.replace(
    /(@\w+)/g,
    '<span class="mention">$1</span>'
  );
}

function createCommentForm(parentId = null) {
  const form = document.createElement("form");
  form.className = "comment-form";
  form.innerHTML = `
    <img class="comment-form__avatar" src="${CURRENT_USER_AVATAR}" alt="" width="40" height="40" />
    <textarea class="comment-form__input" rows="3" placeholder="Add a comment..." required></textarea>
    <button class="comment-form__submit" type="submit">Send</button>
  `;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const textarea = form.querySelector("textarea");
    const content = textarea.value.trim();
    if (!content) return;

    const submitBtn = form.querySelector(".comment-form__submit");
    submitBtn.disabled = true;

    try {
      await apiCreateComment(content, parentId);
      textarea.value = "";
      if (parentId) form.remove();
      await loadComments();
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  return form;
}

function createCommentElement(comment, allComments) {
  const article = document.createElement("article");
  article.className = `comment${comment.isCurrentUser ? " comment--current-user" : ""}`;
  article.dataset.id = comment.id;

  const actionsHtml = comment.isCurrentUser
    ? `<div class="comment__actions">
        <button class="btn btn--danger" type="button" data-action="delete">${icons.delete} Delete</button>
        <button class="btn btn--edit" type="button" data-action="edit">${icons.edit} Edit</button>
      </div>`
    : `<button class="btn btn--reply" type="button" data-action="reply">${icons.reply} Reply</button>`;

  const badgeHtml = comment.isCurrentUser
    ? '<span class="comment__badge">you</span>'
    : "";

  article.innerHTML = `
    <div class="comment__vote" aria-label="Vote controls">
      <button class="vote-btn" type="button" data-action="upvote" aria-label="Upvote">${icons.upvote}</button>
      <span class="comment__score">${comment.score}</span>
      <button class="vote-btn" type="button" data-action="downvote" aria-label="Downvote">${icons.downvote}</button>
    </div>
    <div class="comment__content">
      <header class="comment__header">
        <div class="comment__meta">
          <img class="comment__avatar" src="${comment.avatar}" alt="" width="32" height="32" />
          <span class="comment__username">${comment.username}</span>
          ${badgeHtml}
          <time class="comment__time" datetime="${comment.createdAt}">${formatTimeAgo(comment.createdAt)}</time>
        </div>
        ${actionsHtml}
      </header>
      <p class="comment__body">${formatBody(comment.content)}</p>
    </div>
  `;

  article.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === "upvote" || action === "downvote") {
      await apiVote(comment.id, action === "upvote" ? "up" : "down");
      await loadComments();
    } else if (action === "reply") {
      const existing = article.parentElement.querySelector(".comment-form");
      if (existing) existing.remove();
      const replyForm = createCommentForm(comment.id);
      article.after(replyForm);
      replyForm.querySelector("textarea").focus();
    } else if (action === "delete") {
      if (confirm("Delete this comment and all its replies?")) {
        await apiDeleteComment(comment.id);
        await loadComments();
      }
    } else if (action === "edit") {
      startEdit(comment, article);
    }
  });

  const replies = allComments.filter((c) => c.parentId === comment.id);
  if (replies.length) {
    const repliesEl = document.createElement("div");
    repliesEl.className = "comment__replies";
    replies.forEach((reply) => {
      const { article: replyArticle, repliesEl: nestedReplies } =
        createCommentElement(reply, allComments);
      repliesEl.appendChild(replyArticle);
      if (nestedReplies) repliesEl.appendChild(nestedReplies);
    });
    return { article, repliesEl };
  }

  return { article, repliesEl: null };
}

function startEdit(comment, article) {
  const body = article.querySelector(".comment__body");
  const original = comment.content;

  const form = document.createElement("form");
  form.className = "comment-edit-form";
  form.innerHTML = `
    <textarea class="comment-form__input" rows="3" required>${original}</textarea>
    <div class="comment-edit-form__actions">
      <button class="comment-form__submit" type="submit">Update</button>
      <button class="btn btn--edit" type="button" data-action="cancel">Cancel</button>
    </div>
  `;

  body.replaceWith(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = form.querySelector("textarea").value.trim();
    if (!content) return;
    await apiUpdateComment(comment.id, content);
    await loadComments();
  });

  form.querySelector("[data-action='cancel']").addEventListener("click", () => {
    loadComments();
  });
}

function renderComments() {
  const topLevel = comments.filter((c) => c.parentId === null);
  const fragment = document.createDocumentFragment();

  topLevel.forEach((comment) => {
    const { article, repliesEl } = createCommentElement(comment, comments);
    fragment.appendChild(article);
    if (repliesEl) fragment.appendChild(repliesEl);
  });

  fragment.appendChild(createCommentForm());
  commentsEl.replaceChildren(fragment);
}

async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function apiCreateComment(content, parentId) {
  return apiRequest(API_BASE, {
    method: "POST",
    body: JSON.stringify({ content, parentId }),
  });
}

function apiUpdateComment(id, content) {
  return apiRequest(`${API_BASE}/${id}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });
}

function apiDeleteComment(id) {
  return apiRequest(`${API_BASE}/${id}`, { method: "DELETE" });
}

function apiVote(id, direction) {
  return apiRequest(`${API_BASE}/${id}/vote`, {
    method: "PATCH",
    body: JSON.stringify({ direction }),
  });
}

async function loadComments() {
  comments = await apiRequest(API_BASE);
  renderComments();
}

loadComments().catch((err) => {
  commentsEl.innerHTML = `<p class="error">Failed to load comments: ${err.message}</p>`;
});
