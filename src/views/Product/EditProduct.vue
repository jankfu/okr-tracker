<template>
  <div v-if="product">
    <PageHeader :data="product"></PageHeader>

    <nav class="sub-nav">
      <div class="container container--sidebar">
        <div class="content--main">
          <router-link class="sub-nav__element" exact :to="{ name: 'edit-product' }">{{
            $t('product.title')
          }}</router-link>
          <router-link class="sub-nav__element" :to="{ name: 'edit-product-keyres' }">
            {{ $t('product.objAndKeyres') }}
          </router-link>
        </div>
      </div>
    </nav>

    <div class="content">
      <router-view :docref="product.ref"></router-view>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { productListener, isTeamMemberOfProduct } from '@/db/db';
import PageHeader from '@/components/PageHeader.vue';
import i18n from '@/locale/i18n';

export default {
  name: 'EditProduct',

  components: {
    PageHeader,
  },

  data: () => ({
    product: null,
  }),

  computed: {
    ...mapState(['user']),
  },

  async beforeRouteEnter(to, from, next) {
    if (await isTeamMemberOfProduct(to.params.slug)) {
      next();
    } else {
      next(false);
      throw new Error(i18n.t('errorHandler.noAccess'));
    }
  },

  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },

  created() {
    this.unsubscribe = productListener.call(this, this.$route.params.slug);
  },
};
</script>

<style lang="scss" scoped></style>
