import Component from "@glimmer/component";
import { registerDestructor } from "@ember/destroyable";
import { service } from "@ember/service";
import { apiInitializer } from "discourse/lib/api";
import TrackedMediaQuery from "discourse/lib/tracked-media-query";
import ReplyDirectory from "../components/reply-directory.gjs";

const SidebarDirectory = <template>
  {{#if @outletArgs.renderTimeline}}
    {{#unless @outletArgs.topicProgressExpanded}}
      <ReplyDirectory @topic={{@outletArgs.topic}} />
    {{/unless}}
  {{/if}}
</template>;

class InlineDirectory extends Component {
  @service site;

  widthQuery = new TrackedMediaQuery("(min-width: 925px)");

  constructor() {
    super(...arguments);
    registerDestructor(this, () => this.widthQuery.teardown());
  }

  get visible() {
    return this.site.mobileView || !this.widthQuery.matches;
  }

  <template>
    {{#if this.visible}}
      <ReplyDirectory @inline={{true}} @topic={{@outletArgs.model}} />
    {{/if}}
  </template>
}

export default apiInitializer((api) => {
  if (!api.container.lookup("service:site-settings").reply_titles_enabled) {
    return;
  }

  api.renderInOutlet("topic-navigation", SidebarDirectory);
  api.renderInOutlet("topic-above-posts", InlineDirectory);
});
