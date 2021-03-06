<template>
  <header class="page-header" :class="`page-header--${style}`">
    <div class="container">
      <div class="page-header__container">
        <ul class="breadcrumb" v-if="breadcrumbs">
          <li class="breadcrumb__item">
            <router-link to="/"><i class="fas fa-home"></i>{{ $t('pageHeader.header') }}</router-link>
          </li>
          <li class="breadcrumb__item" v-for="item in breadcrumbs" :key="item.name">
            <router-link v-if="item.routerLinkTo" :to="item.routerLinkTo">{{ item.name }}</router-link>
            <span v-else>{{ item.name }}</span>
          </li>
        </ul>

        <div class="page-header__name" :class="{ 'page-header__name--left': !showImage }">
          <h1 class="title-1">
            <i v-if="icon" :class="`fa fa-fw fa-${icon}`" aria-hidden></i>
            <router-link v-if="data.routerLinkTo" :to="data.routerLinkTo">{{ data.name }}</router-link>
            <template v-else>{{ title }}</template>
          </h1>
        </div>

        <div class="page-header__profile-image page-header__profile-image--icon" v-if="data.icon && showImage">
          <i :class="`fa fa-fw fa-${data.icon}`"></i>
        </div>

        <img
          v-else-if="showImage"
          :src="data.photoURL || '/placeholder-image.svg'"
          :alt="`Profilbilde for ${title}`"
          class="page-header__profile-image"
        />
      </div>
    </div>
  </header>
</template>

<script>
import { serializeDocument } from '@/db/db';
import { db } from '@/config/firebaseConfig';
import * as Toast from '@/util/toasts';
import i18n from '@/locale/i18n';

export default {
  name: 'PageHeader',

  data: () => ({
    breadcrumbs: [],
  }),

  props: {
    data: {
      type: Object,
      required: true,
    },
  },

  computed: {
    title() {
      if (this.data.description) return i18n.t('general.keyres');
      if (!this.data) return i18n.t('general.loading');
      return this.data.name || this.data.displayName || this.data.id || i18n.t('general.loading');
    },

    style() {
      return this.$route.matched.reduce((current, next) => {
        return next.meta.headerStyle || current;
      }, '');
    },

    icon() {
      if (this.style === 'admin') return 'tachometer-alt';
      if (this.style === 'help') return 'question-circle';
      return false;
    },

    showImage() {
      const typesWithImage = ['product', 'edit-product', 'profile', 'department', 'organization', 'me'];
      return typesWithImage.includes(this.style);
    },
  },

  async mounted() {
    this.breadcrumbs = await this.generateBreadcrumbs(this.data);
  },

  watch: {
    async data(data) {
      this.breadcrumbs = await this.generateBreadcrumbs(data);
    },
  },

  methods: {
    async generateBreadcrumbs(data) {
      if (!data || !data.ref || !data.ref.path) return [];
      const ids = data.ref.path.split('/');

      const promises = [];
      while (ids.length > 1) {
        promises.push(db.doc(ids.join('/')).get());
        ids.splice(-2, 2);
      }

      const trail = await Promise.all(promises)
        .then(snapshots => snapshots.map(serializeDocument))
        .then(documents => documents.map(this.getNameAndRouteFromDocument))
        .catch(err => {
          this.$errorHandler('generate_breadcrumbs_error', err);
        });

      return trail.reverse();
    },

    getNameAndRouteFromDocument(document) {
      const routerLinkTo = this.createRouterLinkFromDocument(document);
      let name = document.name || document.displayName || document.name || document.description || document.id;

      if (name.length > 24) {
        name = `${name.split('').splice(0, 24).join('')}...`;
      }

      return { name, routerLinkTo };
    },

    createRouterLinkFromDocument(document) {
      let docType;
      try {
        docType = document.ref.parent.id;
      } catch {
        return;
      }

      if (docType === 'orgs') {
        return { name: 'organization', params: { slug: document.slug } };
      }
      if (docType === 'products') {
        return { name: 'product', params: { slug: document.slug } };
      }
      if (docType === 'departments') {
        return { name: 'department', params: { slug: document.slug } };
      }
      if (docType === 'keyResults') {
        return { name: 'key-result', params: { slug: this.$route.params.slug, keyresid: document.id } };
      }

      if (docType === 'objectives') {
        return null;
      }

      if (docType === 'users') {
        return null;
      }

      Toast.error();
      throw new Error(i18n.t('pageHeader.error'));
    },
  },
};
</script>

<style lang="scss" scoped>
@import '@/styles/page-header.scss';
</style>
