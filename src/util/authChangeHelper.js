import store from '@/store';
import * as Toast from '@/util/toasts';
import { auth, db } from '@/config/firebaseConfig';
import router from '@/router';
import { serializeDocument, updateUserObject } from '@/db/db';
import { errorHandler } from '@/util/utils';

/**
 * Runs whenever the Firebase auth user state changes.
 * - Sets the user object to vuex
 * - Handle automatic route change
 * @param {UserObject} user
 * @return {void}
 */
export default async function handleUserAuthStateChange(user) {
  if (!user) {
    store.commit('SET_USER', null);
  } else if (await isWhiteListed(user)) {
    store.dispatch('initializeApp');

    Toast.loggedIn(user);

    updateUserObject(user);
    db.collection('users')
      .doc(user.email)
      .onSnapshot(snapshot => {
        store.commit('SET_USER', serializeDocument(snapshot));
      });
  } else {
    auth.signOut().then(() => {
      if (this) this.$toasted.show('Logget ut');

      store.commit('SET_USER', null);
      router.push({ name: 'login', params: { error: 1 } });
      errorHandler('not_whitelisted_error', null);
    });
  }
}

/**
 * Checks if the provided user is whitelisted
 * @param {Object} user -
 * @returns {Boolean} true/false
 */
async function isWhiteListed(user) {
  return db
    .collection('users')
    .doc(user.email)
    .get()
    .then(doc => doc.exists)
    .catch(err => {
      errorHandler('not_whitelisted_error', err);
    });
}
