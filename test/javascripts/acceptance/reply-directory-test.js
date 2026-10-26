import { click, visit } from "@ember/test-helpers";
import { test } from "qunit";
import topicFixtures from "discourse/tests/fixtures/topic";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { i18n } from "discourse-i18n";

function directoryResponse() {
  const topic = structuredClone(topicFixtures["/t/280/1.json"]);
  const cooked = [
    "<h1>First post</h1>",
    "<p>#Reading notes</p>",
    "<p>Ordinary reply</p>",
    "<h1>Chapter two</h1>",
    "<p>Text</p><h1>Later heading</h1>",
  ];
  topic.post_stream.posts = topic.post_stream.posts
    .slice(0, 5)
    .map((post, index) => ({
      ...post,
      cooked: cooked[index],
    }));
  topic.post_stream.stream = topic.post_stream.posts.map((post) => post.id);
  topic.highest_post_number = 5;
  topic.posts_count = 5;
  return topic;
}

acceptance("Reply directory - desktop", function (needs) {
  needs.settings({ reply_titles_enabled: true });
  needs.pretender((server, helper) => {
    server.get("/t/280.json", () => helper.response(directoryResponse()));
  });

  test("filters replies, links to original floors, switches timeline and refreshes", async function (assert) {
    await visit("/t/internationalization-localization/280");

    const sidebar = ".reply-directory--sidebar";
    assert.dom(`${sidebar} .reply-directory__list li`).exists({ count: 2 });
    assert.dom(`${sidebar} .reply-directory__label`).hasText("Reading notes");
    assert
      .dom(`${sidebar} .reply-directory__list a`)
      .hasAttribute("href", "/t/internationalization-localization/280/2");
    assert
      .dom(`${sidebar} .reply-directory__count`)
      .hasText(i18n("reply_titles.count", { count: 2 }));
    assert.dom(document.body).hasClass("reply-directory-active");

    await click(`${sidebar} .reply-directory__switch`);
    assert.dom(`${sidebar} .reply-directory__panel`).doesNotExist();
    assert.dom(document.body).doesNotHaveClass("reply-directory-active");

    await click(`${sidebar} .reply-directory__switch`);
    await click(`${sidebar} .reply-directory__refresh`);
    assert.dom(`${sidebar} .reply-directory__list li`).exists({ count: 2 });
  });
});

acceptance("Reply directory - mobile", function (needs) {
  needs.mobileView();
  needs.settings({ reply_titles_enabled: true });
  needs.pretender((server, helper) => {
    server.get("/t/280.json", () => helper.response(directoryResponse()));
  });

  test("opens inline and closes after jumping to a reply", async function (assert) {
    await visit("/t/internationalization-localization/280");
    const panel = ".reply-directory--inline .reply-directory__panel";
    assert.dom(panel).exists();
    assert.dom(panel).doesNotHaveAttribute("open");
    assert.dom(document.body).doesNotHaveClass("reply-directory-active");

    await click(`${panel} summary`);
    assert.dom(panel).hasAttribute("open");
    await click(`${panel} .reply-directory__list a`);
    assert.dom(panel).doesNotHaveAttribute("open");
  });
});

acceptance("Reply directory - disabled", function (needs) {
  needs.settings({ reply_titles_enabled: false });

  test("does not mount or replace the timeline", async function (assert) {
    await visit("/t/internationalization-localization/280");
    assert.dom(".reply-directory").doesNotExist();
    assert.dom(document.body).doesNotHaveClass("reply-directory-active");
  });
});
