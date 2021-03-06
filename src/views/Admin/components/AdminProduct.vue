<template>
  <div v-if="product" class="section">
    <h2 class="title title-2">{{ $t('admin.product.title') }}</h2>

    <CalloutArchivedRestore v-if="product.archived" :docref="docref"></CalloutArchivedRestore>

    <div class="section form-group">
      <label class="form-field">
        <span class="form-label">{{ $t('admin.product.name') }}</span>
        <input ref="nameref" type="text" v-model="product.name" @input="updateSlug" maxlength="64" />
      </label>

      <label
        class="form-field"
        v-tooltip.bottom="{ content: $t('tooltip.cantChange'), delay: { show: 1000, hide: 50 } }"
      >
        <span class="form-label">{{ $t('admin.product.slug') }}</span>
        <span class="form-help">{{ $t('admin.product.slugHelp') }}</span>
        <input type="text" v-model="product.slug" disabled />
      </label>

      <label class="form-field">
        <span class="form-label">{{ $t('admin.product.picture') }}</span>
        <img v-if="product.photoURL" :src="product.photoURL" class="preview-image" />

        <image-uploader
          :max-width="450"
          :max-height="450"
          :quality="0.9"
          :auto-rotate="true"
          output-format="blob"
          accept="image/*"
          do-not-resize="['gif']"
          :preview="false"
          @input="setImage"
        ></image-uploader>
      </label>

      <div class="form-field">
        <label>
          <span class="form-label">{{ $t('admin.product.missionStatement') }}</span>
          <span class="form-help" v-html="$t('admin.product.missionStatementHelp')"></span>
          <textarea rows="4" v-model="product.missionStatement" @input="dirty = true" maxlength="320"></textarea>
        </label>
      </div>

      <div class="form-field">
        <span class="form-label">{{ $t('general.team') }}</span>
        <span class="form-help">{{ $t('admin.product.teamHelp') }}</span>
        <v-select
          class="objective__select"
          label="displayName"
          multiple
          v-model="team"
          :options="users"
          v-tooltip.right="$t('tooltip.team')"
          @input="dirty = true"
        >
          <template v-slot:option="option">
            {{ option.displayName || option.id }}
            <span v-if="option.displayName !== option.id">({{ option.id }})</span>
          </template>
        </v-select>
      </div>
    </div>
    <div class="section">
      <button class="btn" @click="saveObject" :disabled="!dirty" v-tooltip.auto="$t('btn.saveChanges')">
        {{ $t('btn.save') }}
      </button>
      <button
        v-if="isAdmin()"
        class="btn btn--borderless"
        @click="deleteObject"
        v-tooltip.auto="$t('tooltip.adminOnly')"
      >
        {{ $t('admin.product.delete') }}
      </button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { storage } from '@/config/firebaseConfig';
import slugify from '@/util/slugify';
import * as Toast from '@/util/toasts';
import Audit from '@/db/audit';
import CalloutArchivedRestore from '@/components/Callouts/CalloutArchivedRestore.vue';
import { serializeDocument } from '@/db/db';

export default {
  name: 'AdminProduct',

  data: () => ({
    product: null,
    dirty: false,
    team: [],
    unsubscribe: null,
  }),

  computed: {
    ...mapState(['users', 'user']),
  },

  components: {
    CalloutArchivedRestore,
  },

  props: {
    docref: { type: Object, required: true },
  },

  watch: {
    async docref(ref) {
      this.product = null;
      ref
        .get()
        .then(this.getProductfromRef)
        .catch(err => {
          this.$errorHandler('get_product_error', err);
        });
    },
  },

  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },

  async mounted() {
    this.unsubscribe = this.docref.onSnapshot(this.getProductfromRef);
  },

  methods: {
    async saveObject() {
      const teamList = this.team;
      this.product.team = teamList.map(d => d.ref);
      this.docref
        .update({ edited: new Date(), editedBy: this.user.ref, ...this.product })
        .then(Toast.savedChanges)
        .then(() => {
          Audit.updateProduct(this.docref);
        })
        .catch(err => {
          this.$errorHandler('update_product_error', err);
        });
      this.product.team = teamList;
    },

    isAdmin() {
      return this.user?.admin;
    },

    async getProductfromRef(snapshot) {
      if (!snapshot.data()) return;

      this.product = snapshot.data();

      const team = this.product.team || [];
      const promises = team.map(d => d.get());
      const userRefs = await Promise.all(promises).catch(err => {
        this.$errorHandler('get_team_users_error', err);
      });

      this.team = userRefs
        .map(user => ({ id: user.id, ref: user.ref, ...user.data() }))
        .map(user => {
          user.displayName = user.displayName || user.id;
          return user;
        });
    },

    async deleteObject() {
      await this.docref
        .update({ edited: new Date(), editedBy: this.user.ref, archived: true })
        .then(async () => {
          const doc = await this.docref.get().then(serializeDocument);
          Toast.deletedRegret(doc);
          Audit.archiveProduct(this.docref);
        })
        .catch(err => {
          this.$errorHandler('archive_product_error', err);
        });

      this.product = null;
    },

    setImage(file) {
      this.hasImage = true;
      this.file = file;
      this.uploadPhoto();
    },

    updateSlug() {
      this.dirty = true;
      this.product.slug = slugify(this.product.name);
      this.uploadPhoto();
    },

    async uploadPhoto() {
      if (!this.file) return;

      this.uploading = true;
      const storageRef = await storage.ref(`products/${this.docref.id}`);

      const snapshot = await storageRef.put(this.file).catch(err => {
        this.$errorHandler('upload_photo_error', err);
      });

      Toast.uploadedPhoto();

      const photoURL = await snapshot.ref.getDownloadURL();
      await this.docref.update({ photoURL }).catch(err => {
        this.$errorHandler('update_photo_url_error', err);
      });

      Audit.updateProductImage(this.docref);
      Toast.savedChanges();

      this.product.photoURL = photoURL;
      this.uploading = false;
    },
  },
};
</script>
