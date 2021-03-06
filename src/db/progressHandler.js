import Audit from '@/db/audit';
import * as Toast from '@/util/toasts';
import { isTeamMemberOfProduct } from '@/db/db';
import Store from '@/store';
import i18n from '@/locale/i18n';

import { logHandler, errorHandler } from '@/util/utils';

/**
 * Saves a progress for a key result
 * @param {KeyResultObject} keyres - serialized key result object
 * @param {Number} value - The new value to be registered
 * @param {Date} date - Optional date for the progress
 * @returns {Promise}
 */
export async function addProgress(keyres, value, date, addComment) {
  if (!keyres || !keyres.ref) {
    return errorHandler('add_progress_error', new Error(i18n.t('errorHandler.missingKeyRes')));
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return errorHandler('add_progress_error', new Error(i18n.t('errorHandler.process', null, { value })));
  }

  let documentRef;
  const grandParent = keyres.ref.parent.parent.parent.parent;
  if (grandParent.parent.id === 'products') {
    documentRef = grandParent;
  } else {
    documentRef = grandParent.parent.parent;
  }

  const hasEditPermissions = await isTeamMemberOfProduct(documentRef);
  if (!hasEditPermissions) throw errorHandler('add_progress_error', new Error(i18n.t('errorHandler.noAdding')));

  const userRef = Store.state.user.ref;
  const timestamp = date ? new Date(date) : new Date();

  const progressToBeRegistered = {
    value,
    timestamp,
    createdBy: userRef,
    created: new Date(),
    archived: false,
  };

  return keyres.ref
    .collection('progress')
    .add(progressToBeRegistered)
    .then(response => {
      Toast.addedProgression(addComment, response);
      return response;
    })
    .then(updateCurrentValue.bind(null, keyres))
    .then(() => {
      logHandler('add_progress');
    })
    .catch(err => {
      errorHandler('add_progress_error', err);
    });
}

export async function deleteProgress(doc, keyres) {
  if (!doc) throw errorHandler('delete_progress_error', new Error(i18n.t('errorHandler.missing')));

  const documentRef = doc.ref.parent.parent.parent.parent.parent.parent;
  const hasEditPermissions = await isTeamMemberOfProduct(documentRef);

  if (!hasEditPermissions) throw errorHandler('delete_progress_error', new Error(i18n.t('errorHandler.noDeletion')));

  doc.ref
    .delete()
    .then(Toast.deleted)
    .then(updateCurrentValue.bind(null, keyres))
    .then(() => logHandler('delete_progress'))
    .catch(err => {
      errorHandler('delete_progress_error', err);
    });
}

/**
 * Finds the most recent registered value and saves it to the `keyres` object in db
 * @param {KeyResultObject} keyres - serialized key result object
 * @returns {Promise}
 */
async function updateCurrentValue(keyres) {
  if (!keyres) throw errorHandler('update_current_value_error', new Error(i18n.t('errorHandler.missing')));

  let documentRef;
  const grandParent = keyres.ref.parent.parent.parent.parent;
  if (grandParent.parent.id === 'products') {
    documentRef = grandParent;
  } else {
    documentRef = grandParent.parent.parent;
  }
  const hasEditPermissions = await isTeamMemberOfProduct(documentRef);

  if (!hasEditPermissions)
    throw errorHandler('update_current_value_error', new Error(i18n.t('errorHandler.noDeletion')));

  const userRef = Store.state.user.ref;
  const oldValue = keyres.currentValue || keyres.startValue || 0;

  const newValue = await keyres.ref
    .collection('progress')
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get()
    .then(snapshot => {
      if (!snapshot.docs || !snapshot.docs.length) return null;
      return snapshot.docs[0].data().value;
    })
    .catch(err => {
      errorHandler('update_current_value_error', err);
    });

  if (oldValue === newValue) return;

  const parentDocumentRef = keyres.ref.parent.parent.parent.parent;

  return keyres.ref
    .update({ currentValue: newValue, edited: new Date(), editedBy: userRef })
    .then(() => {
      return Audit.keyResUpdateProgress(keyres.ref, parentDocumentRef, oldValue, newValue);
    })
    .catch(err => {
      errorHandler('update_current_value_error', err);
    });
}
