import Vue from 'vue';
import Vuex from 'vuex';

import { db, dashboardUser } from './config/firebaseConfig';
import { quarters, errorHandler } from './util/utils';
import { serializeDocument, getNestedData } from './db/db';
import icons from './config/icons';

Vue.use(Vuex);

export const actions = {
  async initializeApp({ dispatch }) {
    dispatch('watchUsers');
    dispatch('watchProducts');
  },

  watchProducts({ commit }) {
    db.collectionGroup('products').onSnapshot(async () => {
      commit('set_nested_data', await getNestedData());
    });
  },

  watchUsers({ commit }) {
    db.collection('users').onSnapshot(snapshot => {
      const userList = snapshot.docs
        .filter(d => d.id !== dashboardUser)
        .map(serializeDocument)
        .map(user => {
          user.displayName = user.displayName || user.id;
          return user;
        });

      commit('set_users', userList);
    });
  },

  async watchKeyResult({ commit }, id) {
    if (!id) throw new Error('Missing key result id');
    let doc;

    const getKeyRes = db
      .collectionGroup('keyResults')
      .get()
      .then(snapshot => snapshot.docs.filter(d => d.id === id)[0].ref)
      .catch(errorHandler);

    const unsubscribe = await getKeyRes.then(keyResult => {
      if (!keyResult) return;
      doc = keyResult;

      return keyResult.onSnapshot(snapshot => {
        commit('set_key_result', serializeDocument(snapshot));
      });
    });

    return { unsubscribe, doc };
  },

  watchProduct({ commit }, slug) {
    if (!slug) throw new Error('Missing slug');

    const getProduct = db
      .collectionGroup('products')
      .where('slug', '==', slug)
      .get()
      .then(d => d.docs[0].ref)
      .catch(errorHandler);

    // TODO: Unsubscribe from this when not longer needed
    getProduct
      .then(product => {
        product.onSnapshot(snapshot => {
          commit('set_product', serializeDocument(snapshot));
        });
      })
      .catch(errorHandler);

    return getProduct;
  },

  watchDepartment({ commit }, slug) {
    if (!slug) throw new Error('Missing slug');

    const getDepartment = db
      .collectionGroup('departments')
      .where('slug', '==', slug)
      .get()
      .then(d => d.docs[0])
      .then(d => serializeDocument(d))
      .catch(errorHandler);

    getDepartment.then(department => {
      department.ref
        .collection('products')
        .where('archived', '==', false)
        .onSnapshot(d => {
          commit('SET_DEPARTMENTPRODUCTS', d.docs.map(serializeDocument));
        });
    });

    getDepartment.then(department => {
      department.ref.onSnapshot(d => {
        commit('SET_DEPARTMENT', serializeDocument(d));
      });
    });
  },

  setQuarter({ commit }, quarter) {
    commit('SET_QUARTER', quarter);
  },
};

export const getters = {
  get_user_emails(state) {
    return state.users.map(d => d.id);
  },
  departments(state) {
    return state.nest.map(org => org.departments).flat();
  },
};

export const mutations = {
  set_user(state, payload) {
    state.user = payload;
  },

  set_quarters(state, payload) {
    state.quarters = payload;
  },

  set_users(state, payload) {
    state.users = payload;
  },

  set_show_newsfeed(state, payload) {
    state.showNewsfeed = payload;
  },

  set_nested_data(state, payload) {
    state.nest = payload;
  },

  set_product(state, payload) {
    state.product = payload;
  },

  set_key_result(state, payload) {
    state.key_result = payload;
  },

  SET_QUARTER(state, payload) {
    payload = payload || state.quarters[0];
    state.activeQuarter = payload;
  },

  SET_DEPARTMENTPRODUCTS(state, payload) {
    state.departmentProducts = payload;
  },

  SET_DEPARTMENT(state, payload) {
    state.department = payload;
  },
};

export default new Vuex.Store({
  state: {
    user: null,
    users: [],
    nest: [],
    quarters,
    activeQuarter: quarters[0],
    icons,
    showNewsfeed: false,
    key_result: null,
    product: null,
    department: null,
    departmentProducts: null,
  },
  getters,
  mutations,
  actions,
});
