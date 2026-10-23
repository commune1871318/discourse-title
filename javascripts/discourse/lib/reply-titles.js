const BLOCKS = new Set([
  "P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "UL", "OL",
  "BLOCKQUOTE", "PRE", "SECTION", "ARTICLE", "ASIDE", "DETAILS", "SUMMARY",
  "TABLE", "TR", "HR",
]);

// Only a leading level-one heading opts a reply into the directory.
// Discourse cooks "# Title" as H1, but may leave "#Title" as paragraph text.
// DOMParser creates an inert document; no post HTML is inserted into the page.
export function firstLine(cooked) {
  const doc = new DOMParser().parseFromString(cooked || "", "text/html");
  doc.querySelectorAll("script, style, template").forEach((node) => node.remove());
  const first = doc.body.firstElementChild;
  if (!first || !["H1", "P"].includes(first.tagName)) {
    return "";
  }
  let text = "";
  function walk(node) {
    if (node.nodeType === 3) {
      text += node.nodeValue;
      return;
    }
    if (node.nodeType !== 1) {
      return;
    }
    if (node.tagName === "BR") {
      text += "\n";
      return;
    }
    if (node.tagName === "IMG") {
      if (node.classList.contains("emoji")) {
        text += node.getAttribute("alt") || "";
      }
      return;
    }
    const block = BLOCKS.has(node.tagName);
    if (block) {
      text += "\n";
    }
    node.childNodes.forEach(walk);
    if (block) {
      text += "\n";
    }
  }
  walk(first);
  const line = text.split(/\r?\n/).map((line) => line.replace(/[\t\u00a0 ]+/g, " ").trim())
    .find(Boolean) || "";
  return first.tagName === "H1" ? line : line.match(/^#(?!#)\s*(\S.*)$/)?.[1] || "";
}

export function titleEntry(post) {
  if (post.post_number <= 1 || post.post_type !== 1 || post.deleted_at ||
      post.user_deleted || post.hidden) {
    return null;
  }
  const title = firstLine(post.cooked);
  return title ? { id: post.id, number: post.post_number, title } : null;
}

// Keep requests sequential and small. A single long topic must not flood the forum.
// Fetch a fresh, unfiltered topic so a user/summary filter cannot shrink the directory.
export async function loadReplyTitles({ topicId, request, signal, onUpdate }) {
  const entries = new Map();
  const check = () => signal.throwIfAborted();
  const collect = (posts) => {
    check();
    for (const post of posts) {
      const entry = titleEntry(post);
      if (entry) {
        entries.set(entry.id, entry);
      } else {
        entries.delete(post.id);
      }
    }
    onUpdate([...entries.values()].sort((a, b) => a.number - b.number));
  };
  check();
  const topic = await request(`/t/${topicId}.json`);
  check();
  const initial = topic.post_stream.posts;
  collect(initial);

  if (Array.isArray(topic.post_stream.stream) && topic.post_stream.stream.length) {
    const loaded = new Set(initial.map((post) => post.id));
    const missing = topic.post_stream.stream.filter((id) => !loaded.has(id));
    for (let start = 0; start < missing.length; start += 20) {
      check();
      const result = await request(`/t/${topicId}/posts.json`, {
        data: { post_ids: missing.slice(start, start + 20) },
      });
      collect(result.post_stream.posts);
    }
  } else {
    // Current Discourse omits the full ID stream for mega-topics. Use the same
    // forward cursor as core's PostStream.fetchNextWindow instead.
    let cursor = Math.max(0, ...initial.map((post) => post.post_number));
    while (cursor < topic.highest_post_number) {
      check();
      const result = await request(`/t/${topicId}/posts.json`, {
        data: { post_number: cursor, asc: true },
      });
      const posts = result.post_stream.posts;
      collect(posts);
      const next = Math.max(cursor, ...posts.map((post) => post.post_number));
      if (next === cursor) {
        break; // The remaining post numbers may have been deleted or be inaccessible.
      }
      cursor = next;
    }
  }
  check();
  return [...entries.values()].sort((a, b) => a.number - b.number);
}
