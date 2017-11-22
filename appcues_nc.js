"use strict";

/**** Appcues Notification Center sample code *************************
 *
 *    2017-11-21, pete gamache, pete@appcues.com
 *
 *    API Documentation: https://api.appcues.com/v1-docs.html#rel-nc
 *
 *    Overview:
 *
 *    This document provides some example code that wraps the Appcues
 *    Notification Center (NC) API for ease of use.  For precise
 *    details of the NC API, please refer to the above API doc link.
 *
 *    Two model classes are provided, `AppcuesNc` and `AppcuesNc.Item`,
 *    as well as the main entry point, the `AppcuesNc.load()` function,
 *    which loads an NC object asynchronously.
 *
 *    Each `AppcuesNc` object has an `items` property, containing
 *    the Notification Center items for this user, each an instance of
 *    `AppcuesNc.Item`.
 *
 *    Each `AppcuesNc.Item` can toggle its seen/not seen status by
 *    the `markSeen()` and `clearSeen()` methods.
 *
 *    Each `AppcuesNc.Item` object has a `content` property, containing
 *    the Appcues content (announcement, flow, etc.) represented by
 *    the Item.
 *
 *********************************************************************/



/**
 * Represents a user's Appcues Notification Center.
 *
 * Don't use `new AppcuesNc()` directly. Instead, load a user's NC like this:
 *
 *     AppcuesNc.load("myAccountId", "myUserId").then((nc) => {...});
 *
 * @namespace
 * @property {string} accountId
 * @property {string} userId
 * @property {object} context - Contains config params for this NC, if any
 * @property {array} items - Array of AppcuesNc.Item objects, representing
 *   items in the NC.
 */
let AppcuesNc = function (ncResponse) {
  if (typeof ncResponse !== "object") ncResponse = JSON.parse(ncResponse);
  this._hal = ncResponse;

  this.accountId = ncResponse.account_id;
  this.userId = ncResponse.user_id;
  this.context = ncResponse.context;

  for (let k in ncResponse) {
    if (k.indexOf("_") !== 0) this[k] = ncResponse[k];
  }
  let items = ncResponse["_embedded"]["appcues:nc_item"];
  let ncItems = [];
  for (let i in items) ncItems.push(new AppcuesNc.Item(items[i]));
  this.items = ncItems;
};

/**
 * Returns a Promise that resolves to the Appcues Notification Center
 * for the given account and user, or rejects with an error.
 *
 * Requires XMLHttpRequest (i.e., designed for browser).
 *
 * @param {string} accountId
 * @param {string} userId
 * @param {string} opts.url - Optional, URL to be used in page targeting of NC content.
 * @param {string} opts.include - Optional, content types to allow in NC.
 * @param {string} opts.exclude - Optional, content types to disallow in NC.  *
 *
 * @return {Promise}
 */
AppcuesNc.load = function (accountId, userId, opts) {
  let url = AppcuesNc._getNcPath(accountId, userId, opts);
  return AppcuesNc._request(url).then((nc) => new AppcuesNc(nc));
}

/**
 * Performs a request against the given URL.
 * Returns a Promise that either resolves to JSON-decoded response body,
 * or rejects with an error.
 *
 * @param {string} url
 * @param {string} opts.method - Defaults to "POST" if `opts.body`, "GET" otherwise.
 * @param {string} opts.body - Body to be sent along with request.
 *
 * @return {Promise}
 */
AppcuesNc._request = function (url, opts) {
  opts = opts || {};

  var method = opts.method;
  if (!method) method = opts.body ? "POST" : "GET";

  if (url.indexOf("//") === 0) url = "https:" + url;
  else if (url.indexOf("/") === 0) url = "https://nc.appcues.net" + url;

  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.response));
      }
      else {
        reject(xhr.statusText);
      }
    };
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send(opts.body);
  });
}

/**
 * Returns the correct URL path (without hostname and protocol)
 * for the given Appcues Notification Center.
 */
AppcuesNc._getNcPath = function (accountId, userId, opts) {
  opts = opts || {};

  var ncUrl = `/v1/accounts/${accountId}/users/${userId}/nc`;
  var queryString = "";
  for (let key in opts) {
    var value = opts[key];
    if (Array.isArray(value)) value = value.join(",");
    queryString += `${key}=${value}`;
  }
  if (queryString !== "") ncUrl = ncUrl + "?" + queryString;

  return ncUrl;
}

/**
 * Represents an item in the Appcues Notification Center.
 *
 * @namespace
 * @property {string} id
 * @property {string} title
 * @property {number} timestamp
 * @property {boolean} seen
 * @property {string} contentType
 * @property {object} content
 */
AppcuesNc.Item = function (item) {
  this._hal = item;

  for (let k in item) {
    if (k.indexOf("_") !== 0) this[k] = item[k];
  }
};

/**
 * Returns a Promise that represents marking this NC item as having
 * been seen by the user.
 *
 * @return {Promise}
 */
AppcuesNc.Item.prototype.markSeen = function () {
  let self = this;
  let url = this._hal["_links"]["appcues:nc_item_mark_seen"]["href"];
  return AppcuesNc._request(url, {method: "POST"}).then(() => self.seen = true);
};

/**
 * Returns a Promise that represents marking this NC item as having
 * not been seen by the user.
 *
 * @return {Promise}
 */
AppcuesNc.Item.prototype.clearSeen = function () {
  let self = this;
  let url = this._hal["_links"]["appcues:nc_item_clear_seen"]["href"];
  return AppcuesNc._request(url, {method: "POST"}).then(() => self.seen = false);
};


module.exports = AppcuesNc;

