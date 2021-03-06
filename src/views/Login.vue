<template>
  <div class="container">
    <div class="login">
      <div class="section">
        <h1 class="title-1">{{ $t('login.notLoggedIn') }}</h1>
      </div>

      <hr />

      <div class="section">
        <h2 class="title title-3">{{ $t('login.google.title') }}</h2>
        <p>{{ $t('login.google.info') }}</p>

        <div v-if="error === 1" class="error">
          {{ $t('login.error.wrongEmail') }}
        </div>
        <div v-if="error === 2" class="error">
          {{ $t('login.error.googleError') }}
        </div>

        <div class="form-field">
          <button class="btn" @click="loginWithGoogle">{{ $t('login.google.btn') }}</button>
        </div>
      </div>
      <hr />
      <div class="section">
        <h2 class="title title-3">{{ $t('login.dashboard.title') }}</h2>
        <p>{{ $t('login.dashboard.info') }}</p>
        <div class="section">
          <div v-if="error === 3" class="error">
            {{ $t('login.error.wrongPassword') }}
          </div>
          <form @submit.prevent="submitPassword()">
            <label class="form-field">
              <span class="form-label">Passord</span>
              <div class="form-login">
                <input class="field" type="password" v-model="password" />
                <button class="btn">
                  {{ $t('login.dashboard.btn') }}
                </button>
              </div>
            </label>
          </form>
        </div>
        <hr />
      </div>
    </div>

    <the-spinner v-if="pending"></the-spinner>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import { auth, loginProvider } from '@/config/firebaseConfig';
import TheSpinner from '@/components/TheSpinner.vue';
import Audit from '@/db/audit';
import i18n from '@/locale/i18n';

export default {
  data: () => ({
    error: true,
    password: '',
    pending: false,
  }),

  metaInfo() {
    return {
      title: ` ${i18n.t('general.project')} | ${i18n.t('general.owner')}`,
    };
  },

  components: {
    TheSpinner,
  },

  computed: {
    ...mapState(['user']),
  },

  methods: {
    loginWithGoogle() {
      this.pending = true;
      auth
        .signInWithPopup(loginProvider)
        .then(response => {
          Audit.login(response.user.email);
          this.$router.push('/');
        })
        .catch(err => {
          this.pending = false;
          this.error = 2;
          this.$errorHandler('login_error', err);
        });
    },

    async submitPassword() {
      this.pending = true;
      const email = process.env.VUE_APP_DASHBOARD_USER;
      const user = await auth.signInWithEmailAndPassword(email, this.password).catch(err => {
        this.pending = false;
        if (err.code === 'auth/wrong-password') {
          this.error = 3;
        }
        this.$errorHandler('login_error', err);
      });

      if (user) {
        this.$router.push('/');
      } else {
        this.error = 3;
      }
    },
  },

  beforeRouteEnter(to, from, next) {
    if (auth.currentUser) {
      next('/');
    } else {
      next();
    }
  },

  mounted() {
    this.error = this.$route.params.error;
  },
};
</script>

<style lang="scss" scoped>
@import '../styles/_colors.scss';

.login {
  max-width: 500px;
}

.form-login {
  display: flex;
}

.container {
  display: flex;
  align-items: center;
  min-height: calc(80vh - 5rem);
}

.error {
  margin: 1.5rem 0;
  padding: 1em 1.5em;
  color: black;
  background: rgba($color-red, 0.25);
  border: 2px solid $color-red;
  border-radius: 4px;
}
</style>
