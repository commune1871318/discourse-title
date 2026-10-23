import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { registerDestructor } from "@ember/destroyable";
import { on } from "@ember/modifier";
import didInsert from "@ember/render-modifiers/modifiers/did-insert";
import didUpdate from "@ember/render-modifiers/modifiers/did-update";
import bodyClass from "discourse/helpers/body-class";
import { ajax } from "discourse/lib/ajax";
import DiscourseURL from "discourse/lib/url";
import { eq } from "discourse/truth-helpers";
import { i18n } from "discourse-i18n";
import { loadReplyTitles } from "../lib/reply-titles";

export default class ReplyDirectory extends Component {
  @tracked entries = [];
  @tracked loading = true;
  @tracked failed = false;
  @tracked showTimeline = false;
  controller;

  constructor() {
    super(...arguments);
    registerDestructor(this, () => this.controller?.abort());
  }

  get title() {
    return i18n(themePrefix("reply_titles.title"));
  }

  get count() {
    return i18n(themePrefix("reply_titles.count"), { count: this.entries.length });
  }

  get links() {
    return this.entries.map((entry) => ({
      ...entry,
      label: entry.title,
      href: `${this.args.topic.url}/${entry.number}`,
    }));
  }

  @action
  async refresh() {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.entries = [];
    this.loading = true;
    this.failed = false;
    try {
      await loadReplyTitles({
        topicId: this.args.topic.id,
        request: ajax,
        signal: controller.signal,
        onUpdate: (entries) => { this.entries = entries; },
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        this.failed = true;
      }
    } finally {
      if (!controller.signal.aborted) {
        this.loading = false;
      }
    }
  }

  @action
  toggleTimeline() {
    this.showTimeline = !this.showTimeline;
  }

  @action
  jump(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    DiscourseURL.routeTo(event.currentTarget.getAttribute("href"));
    if (this.args.inline) {
      event.currentTarget.closest("details").open = false;
    }
  }

  <template>
    <div
      class={{if @inline "reply-directory reply-directory--inline" "reply-directory reply-directory--sidebar"}}
      {{didInsert this.refresh}}
      {{didUpdate this.refresh @topic.id @topic.highest_post_number @topic.last_posted_at}}
    >
      {{#unless @inline}}
        {{#unless this.showTimeline}}
          {{bodyClass "reply-directory-active"}}
        {{/unless}}
        <button type="button" class="reply-directory__switch" {{on "click" this.toggleTimeline}}>
          {{#if this.showTimeline}}
            {{i18n (themePrefix "reply_titles.show_directory")}}
          {{else}}
            {{i18n (themePrefix "reply_titles.show_timeline")}}
          {{/if}}
        </button>
      {{/unless}}

      {{#unless this.showTimeline}}
        <details class="reply-directory__panel" open={{unless @inline true}}>
          <summary class="reply-directory__heading">
            <span>{{this.title}}</span>
            <span class="reply-directory__count">{{this.count}}</span>
          </summary>
          <nav aria-label={{this.title}} class="reply-directory__content" aria-busy={{this.loading}}>
            <ol class="reply-directory__list">
              {{#each this.links key="id" as |entry|}}
                <li>
                  <a
                    href={{entry.href}}
                    title={{entry.label}}
                    aria-current={{if (eq entry.number @topic.currentPost) "location"}}
                    {{on "click" this.jump}}
                  >
                    <span class="reply-directory__number">#{{entry.number}}</span>
                    <span class="reply-directory__label">{{entry.label}}</span>
                  </a>
                </li>
              {{/each}}
            </ol>
            {{#if this.loading}}
              <p class="reply-directory__status" role="status">{{i18n (themePrefix "reply_titles.loading")}}</p>
            {{else if this.failed}}
              <p class="reply-directory__status" role="alert">{{i18n (themePrefix "reply_titles.failed")}}</p>
            {{else unless this.entries.length}}
              <p class="reply-directory__status">{{i18n (themePrefix "reply_titles.empty")}}</p>
            {{/if}}
          </nav>
          <button type="button" class="reply-directory__refresh" disabled={{this.loading}} {{on "click" this.refresh}}>
            {{i18n (themePrefix "reply_titles.refresh")}}
          </button>
        </details>
      {{/unless}}
    </div>
  </template>
}
