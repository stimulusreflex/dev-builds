import { Controller } from "@hotwired/stimulus";

import { createConsumer } from "@rails/actioncable";

import CableReady from "cable_ready";

let app = {};

var Stimulus = {
  get app() {
    return app;
  },
  set(application) {
    app = application;
  }
};

const defaultSchema = {
  reflexAttribute: "data-reflex",
  reflexPermanentAttribute: "data-reflex-permanent",
  reflexRootAttribute: "data-reflex-root",
  reflexSuppressLoggingAttribute: "data-reflex-suppress-logging",
  reflexDatasetAttribute: "data-reflex-dataset",
  reflexDatasetAllAttribute: "data-reflex-dataset-all",
  reflexSerializeFormAttribute: "data-reflex-serialize-form",
  reflexFormSelectorAttribute: "data-reflex-form-selector",
  reflexIncludeInnerHtmlAttribute: "data-reflex-include-inner-html",
  reflexIncludeTextContentAttribute: "data-reflex-include-text-content"
};

let schema = {};

var Schema = {
  set(application) {
    schema = {
      ...defaultSchema,
      ...application.schema
    };
    for (const attribute in schema) {
      const attributeName = attribute.slice(0, -9);
      if (!this.hasOwnProperty(attributeName)) {
        Object.defineProperty(this, attributeName, {
          get: () => schema[attribute]
        });
      }
    }
  }
};

let debugging = false;

var Debug$1 = {
  get enabled() {
    return debugging;
  },
  get disabled() {
    return !debugging;
  },
  get value() {
    return debugging;
  },
  set(value) {
    debugging = !!value;
  },
  set debug(value) {
    debugging = !!value;
  }
};

const request = reflex => {
  if (Debug$1.disabled || reflex.data.suppressLogging) return;
  console.log(`↑ stimulus ↑ ${reflex.target}`, {
    id: reflex.id,
    args: reflex.data.args,
    controller: reflex.controller.identifier,
    element: reflex.element,
    controllerElement: reflex.controller.element
  });
};

const success = reflex => {
  if (Debug$1.disabled || reflex.data.suppressLogging) return;
  const output = {
    id: reflex.id,
    morph: reflex.morph,
    payload: reflex.payload
  };
  if (reflex.operation !== "dispatch_event") output.operation = reflex.operation;
  console.log(`↓ reflex ↓ ${reflex.target} → ${reflex.selector || "∞"}${progress(reflex)} ${duration(reflex)}`, output);
};

const halted$1 = reflex => {
  if (Debug$1.disabled || reflex.data.suppressLogging) return;
  console.log(`↓ reflex ↓ ${reflex.target} ${duration(reflex)} %cHALTED`, "color: #ffa500;", {
    id: reflex.id,
    payload: reflex.payload
  });
};

const forbidden$1 = reflex => {
  if (Debug$1.disabled || reflex.data.suppressLogging) return;
  console.log(`↓ reflex ↓ ${reflex.target} ${duration(reflex)} %cFORBIDDEN`, "color: #BF40BF;", {
    id: reflex.id,
    payload: reflex.payload
  });
};

const error$1 = reflex => {
  if (Debug$1.disabled || reflex.data.suppressLogging) return;
  console.log(`↓ reflex ↓ ${reflex.target} ${duration(reflex)} %cERROR: ${reflex.error}`, "color: #f00;", {
    id: reflex.id,
    payload: reflex.payload
  });
};

const duration = reflex => !reflex.cloned ? `in ${new Date - reflex.timestamp}ms` : "CLONED";

const progress = reflex => reflex.totalOperations > 1 ? ` ${reflex.completedOperations}/${reflex.totalOperations}` : "";

var Log = {
  request: request,
  success: success,
  halted: halted$1,
  forbidden: forbidden$1,
  error: error$1
};

let deprecationWarnings = true;

var Deprecate = {
  get enabled() {
    return deprecationWarnings;
  },
  get disabled() {
    return !deprecationWarnings;
  },
  get value() {
    return deprecationWarnings;
  },
  set(value) {
    deprecationWarnings = !!value;
  },
  set deprecate(value) {
    deprecationWarnings = !!value;
  }
};

class Reflex {
  constructor(data, controller) {
    this.data = data.valueOf();
    this.controller = controller;
    this.element = data.reflexElement;
    this.id = data.id;
    this.error = null;
    this.payload = null;
    this.stage = "created";
    this.lifecycle = [ "created" ];
    this.warned = false;
    this.target = data.target;
    this.action = data.target.split("#")[1];
    this.selector = null;
    this.morph = null;
    this.operation = null;
    this.timestamp = new Date;
    this.cloned = false;
  }
  get getPromise() {
    const promise = new Promise(((resolve, reject) => {
      this.promise = {
        resolve: resolve,
        reject: reject,
        data: this.data
      };
    }));
    promise.id = this.id;
    Object.defineProperty(promise, "reflexId", {
      get() {
        if (Deprecate.enabled) console.warn("reflexId is deprecated and will be removed from v4. Use id instead.");
        return this.id;
      }
    });
    promise.reflex = this;
    if (Debug$1.enabled) promise.catch((() => {}));
    return promise;
  }
}

const uuidv4 = () => {
  const crypto = window.crypto || window.msCrypto;
  return ([ 1e7 ] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));
};

const serializeForm = (form, options = {}) => {
  if (!form) return "";
  const w = options.w || window;
  const {element: element} = options;
  const formData = new w.FormData(form);
  const data = Array.from(formData, (e => e.map(encodeURIComponent).join("=")));
  const submitButton = form.querySelector("input[type=submit]");
  if (element && element.name && element.nodeName === "INPUT" && element.type === "submit") {
    data.push(`${encodeURIComponent(element.name)}=${encodeURIComponent(element.value)}`);
  } else if (submitButton && submitButton.name) {
    data.push(`${encodeURIComponent(submitButton.name)}=${encodeURIComponent(submitButton.value)}`);
  }
  return Array.from(data).join("&");
};

const camelize = (value, uppercaseFirstLetter = true) => {
  if (typeof value !== "string") return "";
  value = value.replace(/[\s_](.)/g, ($1 => $1.toUpperCase())).replace(/[\s_]/g, "").replace(/^(.)/, ($1 => $1.toLowerCase()));
  if (uppercaseFirstLetter) value = value.substr(0, 1).toUpperCase() + value.substr(1);
  return value;
};

const debounce = (callback, delay = 250) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout((() => {
      timeoutId = null;
      callback(...args);
    }), delay);
  };
};

const extractReflexName = reflexString => {
  const match = reflexString.match(/(?:.*->)?(.*?)(?:Reflex)?#/);
  return match ? match[1] : "";
};

const emitEvent = (event, detail) => {
  document.dispatchEvent(new CustomEvent(event, {
    bubbles: true,
    cancelable: false,
    detail: detail
  }));
  if (window.jQuery) window.jQuery(document).trigger(event, detail);
};

const elementToXPath = element => {
  if (element.id !== "") return "//*[@id='" + element.id + "']";
  if (element === document.body) return "/html/body";
  if (element.nodeName === "HTML") return "/html";
  let ix = 0;
  const siblings = element && element.parentNode ? element.parentNode.childNodes : [];
  for (var i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === element) {
      const computedPath = elementToXPath(element.parentNode);
      const tagName = element.tagName.toLowerCase();
      const ixInc = ix + 1;
      return `${computedPath}/${tagName}[${ixInc}]`;
    }
    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
      ix++;
    }
  }
};

const XPathToElement = xpath => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

const XPathToArray = (xpath, reverse = false) => {
  const snapshotList = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  const snapshots = [];
  for (let i = 0; i < snapshotList.snapshotLength; i++) {
    snapshots.push(snapshotList.snapshotItem(i));
  }
  return reverse ? snapshots.reverse() : snapshots;
};

const elementInvalid = element => element.type === "number" && element.validity && element.validity.badInput;

const getReflexElement = (args, element) => args[0] && args[0].nodeType === Node.ELEMENT_NODE ? args.shift() : element;

const getReflexOptions = args => {
  const options = {};
  if (args[0] && typeof args[0] === "object" && Object.keys(args[0]).filter((key => [ "id", "attrs", "selectors", "reflexId", "resolveLate", "serializeForm", "suppressLogging", "includeInnerHTML", "includeTextContent" ].includes(key))).length) {
    const opts = args.shift();
    Object.keys(opts).forEach((o => {
      if (o === "reflexId") {
        if (Deprecate.enabled) console.warn("reflexId option will be removed in v4. Use id instead.");
        options["id"] = opts["reflexId"];
      } else options[o] = opts[o];
    }));
  }
  return options;
};

const getReflexRoots = element => {
  let list = [];
  while (list.length === 0 && element) {
    let reflexRoot = element.getAttribute(Schema.reflexRoot);
    if (reflexRoot) {
      if (reflexRoot.length === 0 && element.id) reflexRoot = `#${element.id}`;
      const selectors = reflexRoot.split(",").filter((s => s.trim().length));
      if (Debug.enabled && selectors.length === 0) {
        console.error(`No value found for ${Schema.reflexRoot}. Add an #id to the element or provide a value for ${Schema.reflexRoot}.`, element);
      }
      list = list.concat(selectors.filter((s => document.querySelector(s))));
    }
    element = element.parentElement ? element.parentElement.closest(`[${Schema.reflexRoot}]`) : null;
  }
  return list;
};

const multipleInstances = element => {
  if ([ "checkbox", "radio" ].includes(element.type)) {
    return document.querySelectorAll(`input[type="${element.type}"][name="${element.name}"]`).length > 1;
  }
  return false;
};

const collectCheckedOptions = element => Array.from(element.querySelectorAll("option:checked")).concat(Array.from(document.querySelectorAll(`input[type="${element.type}"][name="${element.name}"]`)).filter((elem => elem.checked))).map((o => o.value));

const attributeValue = (values = []) => {
  const value = Array.from(new Set(values.filter((v => v && String(v).length)).map((v => v.trim())))).join(" ").trim();
  return value.length > 0 ? value : null;
};

const attributeValues = value => {
  if (!value) return [];
  if (!value.length) return [];
  return value.split(" ").filter((v => v.trim().length));
};

const extractElementAttributes = element => {
  let attrs = Array.from(element.attributes).reduce(((memo, attr) => {
    memo[attr.name] = attr.value;
    return memo;
  }), {});
  attrs.checked = !!element.checked;
  attrs.selected = !!element.selected;
  attrs.tag_name = element.tagName;
  if (element.tagName.match(/select/i) || multipleInstances(element)) {
    const collectedOptions = collectCheckedOptions(element);
    attrs.values = collectedOptions;
    attrs.value = collectedOptions.join(",");
  } else {
    attrs.value = element.value;
  }
  return attrs;
};

const getElementsFromTokens = (element, tokens) => {
  if (!tokens || tokens.length === 0) return [];
  let elements = [ element ];
  const xPath = elementToXPath(element);
  tokens.forEach((token => {
    try {
      switch (token) {
       case "combined":
        if (Deprecate.enabled) console.warn("In the next version of StimulusReflex, the 'combined' option to data-reflex-dataset will become 'ancestors'.");
        elements = [ ...elements, ...XPathToArray(`${xPath}/ancestor::*`, true) ];
        break;

       case "ancestors":
        elements = [ ...elements, ...XPathToArray(`${xPath}/ancestor::*`, true) ];
        break;

       case "parent":
        elements = [ ...elements, ...XPathToArray(`${xPath}/parent::*`) ];
        break;

       case "siblings":
        elements = [ ...elements, ...XPathToArray(`${xPath}/preceding-sibling::*|${xPath}/following-sibling::*`) ];
        break;

       case "children":
        elements = [ ...elements, ...XPathToArray(`${xPath}/child::*`) ];
        break;

       case "descendants":
        elements = [ ...elements, ...XPathToArray(`${xPath}/descendant::*`) ];
        break;

       default:
        elements = [ ...elements, ...document.querySelectorAll(token) ];
      }
    } catch (error) {
      if (Debug$1.enabled) console.error(error);
    }
  }));
  return elements;
};

const extractElementDataset = element => {
  const dataset = element.attributes[Schema.reflexDataset];
  const allDataset = element.attributes[Schema.reflexDatasetAll];
  const tokens = dataset && dataset.value.split(" ") || [];
  const allTokens = allDataset && allDataset.value.split(" ") || [];
  const datasetElements = getElementsFromTokens(element, tokens);
  const datasetAllElements = getElementsFromTokens(element, allTokens);
  const datasetAttributes = datasetElements.reduce(((acc, ele) => ({
    ...extractDataAttributes(ele),
    ...acc
  })), {});
  const reflexElementAttributes = extractDataAttributes(element);
  const elementDataset = {
    dataset: {
      ...reflexElementAttributes,
      ...datasetAttributes
    },
    datasetAll: {}
  };
  datasetAllElements.forEach((element => {
    const elementAttributes = extractDataAttributes(element);
    Object.keys(elementAttributes).forEach((key => {
      const value = elementAttributes[key];
      if (elementDataset.datasetAll[key] && Array.isArray(elementDataset.datasetAll[key])) {
        elementDataset.datasetAll[key].push(value);
      } else {
        elementDataset.datasetAll[key] = [ value ];
      }
    }));
  }));
  return elementDataset;
};

const extractDataAttributes = element => {
  let attrs = {};
  if (element && element.attributes) {
    Array.from(element.attributes).forEach((attr => {
      if (attr.name.startsWith("data-")) {
        attrs[attr.name] = attr.value;
      }
    }));
  }
  return attrs;
};

var name = "stimulus_reflex";

var version = "3.5.0-pre9";

var description = "Build reactive applications with the Rails tooling you already know and love.";

var keywords = [ "ruby", "rails", "websockets", "actioncable", "turbolinks", "reactive", "cable", "ujs", "ssr", "stimulus", "reflex", "stimulus_reflex", "dom", "morphdom" ];

var homepage = "https://docs.stimulusreflex.com/";

var bugs = {
  url: "https://github.com/stimulusreflex/stimulus_reflex/issues"
};

var repository = {
  type: "git",
  url: "git+https://github.com:stimulusreflex/stimulus_reflex.git"
};

var license = "MIT";

var author = "Nathan Hopkins <natehop@gmail.com>";

var main = "./dist/stimulus_reflex.umd.min.js";

var module = "./dist/stimulus_reflex.min.js";

var files = [ "dist/*", "javascript/*" ];

var scripts = {
  lint: "yarn prettier-standard:check",
  format: "yarn prettier-standard:format",
  build: "yarn rollup -c",
  "build:watch": "yarn rollup -wc",
  watch: "yarn build:watch",
  "prettier-standard:check": "yarn run prettier-standard --check ./javascript/**/*.js rollup.config.js",
  "prettier-standard:format": "yarn run prettier-standard ./javascript/**/*.js rollup.config.js",
  test: "web-test-runner javascript/test/**/*.test.js"
};

var peerDependencies = {
  "@hotwired/stimulus": ">= 3.0"
};

var dependencies = {
  "@hotwired/stimulus": ">= 3.0",
  "@rails/actioncable": ">= 6.0",
  cable_ready: ">= 5.0.0-pre9"
};

var devDependencies = {
  "@open-wc/testing": "^3.1.2",
  "@rollup/plugin-commonjs": "^21.0.3",
  "@rollup/plugin-json": "^4.1.0",
  "@rollup/plugin-node-resolve": "^13.1.3",
  "@web/dev-server-esbuild": "^0.3.0",
  "@web/dev-server-rollup": "^0.3.15",
  "@web/test-runner": "^0.13.27",
  "prettier-standard": "^16.4.1",
  rollup: "^2.70.1",
  "rollup-plugin-terser": "^7.0.2"
};

var packageInfo = {
  name: name,
  version: version,
  description: description,
  keywords: keywords,
  homepage: homepage,
  bugs: bugs,
  repository: repository,
  license: license,
  author: author,
  main: main,
  module: module,
  files: files,
  scripts: scripts,
  peerDependencies: peerDependencies,
  dependencies: dependencies,
  devDependencies: devDependencies
};

class ReflexData {
  constructor(options, reflexElement, controllerElement, reflexController, permanentAttributeName, target, args, url, tabId) {
    this.options = options;
    this.reflexElement = reflexElement;
    this.controllerElement = controllerElement;
    this.reflexController = reflexController;
    this.permanentAttributeName = permanentAttributeName;
    this.target = target;
    this.args = args;
    this.url = url;
    this.tabId = tabId;
  }
  get attrs() {
    this._attrs = this._attrs || this.options["attrs"] || extractElementAttributes(this.reflexElement);
    return this._attrs;
  }
  get id() {
    this._id = this._id || this.options["id"] || uuidv4();
    return this._id;
  }
  get selectors() {
    this._selectors = this._selectors || this.options["selectors"] || getReflexRoots(this.reflexElement);
    return typeof this._selectors === "string" ? [ this._selectors ] : this._selectors;
  }
  get resolveLate() {
    return this.options["resolveLate"] || false;
  }
  get dataset() {
    this._dataset = this._dataset || extractElementDataset(this.reflexElement);
    return this._dataset;
  }
  get innerHTML() {
    return this.includeInnerHtml ? this.reflexElement.innerHTML : "";
  }
  get textContent() {
    return this.includeTextContent ? this.reflexElement.textContent : "";
  }
  get xpathController() {
    return elementToXPath(this.controllerElement);
  }
  get xpathElement() {
    return elementToXPath(this.reflexElement);
  }
  get formSelector() {
    const attr = this.reflexElement.attributes[Schema.reflexFormSelector] ? this.reflexElement.attributes[Schema.reflexFormSelector].value : undefined;
    return this.options["formSelector"] || attr;
  }
  get includeInnerHtml() {
    const attr = this.reflexElement.attributes[Schema.reflexIncludeInnerHtml] || false;
    return this.options["includeInnerHTML"] || attr ? attr.value !== "false" : false;
  }
  get includeTextContent() {
    const attr = this.reflexElement.attributes[Schema.reflexIncludeTextContent] || false;
    return this.options["includeTextContent"] || attr ? attr.value !== "false" : false;
  }
  get suppressLogging() {
    return this.options["suppressLogging"] || this.reflexElement.attributes[Schema.reflexSuppressLogging] || false;
  }
  valueOf() {
    return {
      attrs: this.attrs,
      dataset: this.dataset,
      selectors: this.selectors,
      id: this.id,
      resolveLate: this.resolveLate,
      suppressLogging: this.suppressLogging,
      xpathController: this.xpathController,
      xpathElement: this.xpathElement,
      inner_html: this.innerHTML,
      text_content: this.textContent,
      formSelector: this.formSelector,
      reflexController: this.reflexController,
      permanentAttributeName: this.permanentAttributeName,
      target: this.target,
      args: this.args,
      url: this.url,
      tabId: this.tabId,
      version: packageInfo.version
    };
  }
}

let isolationMode = false;

var IsolationMode = {
  get disabled() {
    return !isolationMode;
  },
  set(value) {
    isolationMode = value;
    if (Deprecate.enabled && !isolationMode) {
      document.addEventListener("DOMContentLoaded", (() => console.warn("Deprecation warning: the next version of StimulusReflex will standardize isolation mode, and the isolate option will be removed.\nPlease update your applications to assume that every tab will be isolated. Use CableReady operations to broadcast updates to other tabs and users.")), {
        once: true
      });
    }
  }
};

let transport = {};

var Transport = {
  get plugin() {
    return transport;
  },
  set(newTransport) {
    transport = newTransport;
  }
};

const stages = [ "created", "before", "delivered", "queued", "after", "finalized", "success", "error", "halted", "forbidden" ];

let lastReflex;

const reflexes = new Proxy({}, {
  get: function(target, prop) {
    if (stages.includes(prop)) return Object.fromEntries(Object.entries(target).filter((([_, reflex]) => reflex.stage === prop))); else if (prop === "last") return lastReflex; else if (prop === "all") return target;
    return Reflect.get(...arguments);
  },
  set: function(target, prop, value) {
    target[prop] = value;
    lastReflex = value;
    return true;
  }
});

const invokeLifecycleMethod = (reflex, stage) => {
  const specificLifecycleMethod = reflex.controller[[ "before", "after", "finalize" ].includes(stage) ? `${stage}${camelize(reflex.action)}` : `${camelize(reflex.action, false)}${camelize(stage)}`];
  const genericLifecycleMethod = reflex.controller[[ "before", "after", "finalize" ].includes(stage) ? `${stage}Reflex` : `reflex${camelize(stage)}`];
  if (typeof specificLifecycleMethod === "function") {
    specificLifecycleMethod.call(reflex.controller, reflex.element, reflex.target, reflex.error, reflex.id, reflex.payload);
  }
  if (typeof genericLifecycleMethod === "function") {
    genericLifecycleMethod.call(reflex.controller, reflex.element, reflex.target, reflex.error, reflex.id, reflex.payload);
  }
};

const dispatchLifecycleEvent = (reflex, stage) => {
  if (!reflex.controller.element.parentElement) {
    if (Debug$1.enabled && !reflex.warned) {
      console.warn(`StimulusReflex was not able execute callbacks or emit events for "${stage}" or later life-cycle stages for this Reflex. The StimulusReflex Controller Element is no longer present in the DOM. Could you move the StimulusReflex Controller to an element higher in your DOM?`);
      reflex.warned = true;
    }
    return;
  }
  reflex.stage = stage;
  reflex.lifecycle.push(stage);
  const event = `stimulus-reflex:${stage}`;
  const action = `${event}:${reflex.action}`;
  const detail = {
    reflex: reflex.target,
    controller: reflex.controller,
    id: reflex.id,
    element: reflex.element,
    payload: reflex.payload
  };
  const options = {
    bubbles: true,
    cancelable: false,
    detail: detail
  };
  reflex.controller.element.dispatchEvent(new CustomEvent(event, options));
  reflex.controller.element.dispatchEvent(new CustomEvent(action, options));
  if (window.jQuery) {
    window.jQuery(reflex.controller.element).trigger(event, detail);
    window.jQuery(reflex.controller.element).trigger(action, detail);
  }
};

document.addEventListener("stimulus-reflex:before", (event => invokeLifecycleMethod(reflexes[event.detail.id], "before")), true);

document.addEventListener("stimulus-reflex:queued", (event => invokeLifecycleMethod(reflexes[event.detail.id], "queued")), true);

document.addEventListener("stimulus-reflex:delivered", (event => invokeLifecycleMethod(reflexes[event.detail.id], "delivered")), true);

document.addEventListener("stimulus-reflex:success", (event => {
  const reflex = reflexes[event.detail.id];
  invokeLifecycleMethod(reflex, "success");
  dispatchLifecycleEvent(reflex, "after");
}), true);

document.addEventListener("stimulus-reflex:nothing", (event => dispatchLifecycleEvent(reflexes[event.detail.id], "success")), true);

document.addEventListener("stimulus-reflex:error", (event => {
  const reflex = reflexes[event.detail.id];
  invokeLifecycleMethod(reflex, "error");
  dispatchLifecycleEvent(reflex, "after");
}), true);

document.addEventListener("stimulus-reflex:halted", (event => invokeLifecycleMethod(reflexes[event.detail.id], "halted")), true);

document.addEventListener("stimulus-reflex:forbidden", (event => invokeLifecycleMethod(reflexes[event.detail.id], "forbidden")), true);

document.addEventListener("stimulus-reflex:after", (event => invokeLifecycleMethod(reflexes[event.detail.id], "after")), true);

document.addEventListener("stimulus-reflex:finalize", (event => invokeLifecycleMethod(reflexes[event.detail.id], "finalize")), true);

const received = data => {
  if (!data.cableReady) return;
  if (data.version.replace(".pre", "-pre") !== CableReady.version) {
    if (Debug$1.enabled) console.error(`Reflex failed due to cable_ready gem/NPM package version mismatch. Package versions must match exactly.\nNote that if you are using pre-release builds, gems use the "x.y.z.preN" version format, while NPM packages use "x.y.z-preN".\n\ncable_ready gem: ${data.version}\ncable_ready NPM: ${CableReady.version}`);
    return;
  }
  let reflexOperations = [];
  for (let i = data.operations.length - 1; i >= 0; i--) {
    if (data.operations[i].stimulusReflex) {
      reflexOperations.push(data.operations[i]);
      data.operations.splice(i, 1);
    }
  }
  if (reflexOperations.some((operation => operation.stimulusReflex.url !== location.href))) {
    if (Debug$1.enabled) {
      console.error("Reflex failed due to mismatched URL.");
      return;
    }
  }
  let reflexData;
  if (reflexOperations.length) {
    reflexData = reflexOperations[0].stimulusReflex;
    reflexData.payload = reflexOperations[0].payload;
  }
  if (reflexData) {
    const {id: id, payload: payload} = reflexData;
    let reflex;
    if (!reflexes[id] && IsolationMode.disabled) {
      const controllerElement = XPathToElement(reflexData.xpathController);
      const reflexElement = XPathToElement(reflexData.xpathElement);
      controllerElement.reflexController = controllerElement.reflexController || {};
      controllerElement.reflexData = controllerElement.reflexData || {};
      controllerElement.reflexError = controllerElement.reflexError || {};
      const controller = Stimulus.app.getControllerForElementAndIdentifier(controllerElement, reflexData.reflexController);
      controllerElement.reflexController[id] = controller;
      controllerElement.reflexData[id] = reflexData;
      reflex = new Reflex(reflexData, controller);
      reflexes[id] = reflex;
      reflex.cloned = true;
      reflex.element = reflexElement;
      controller.lastReflex = reflex;
      dispatchLifecycleEvent(reflex, "before");
      reflex.getPromise;
    } else {
      reflex = reflexes[id];
    }
    if (reflex) {
      reflex.payload = payload;
      reflex.totalOperations = reflexOperations.length;
      reflex.pendingOperations = reflexOperations.length;
      reflex.completedOperations = 0;
      reflex.piggybackOperations = data.operations;
      CableReady.perform(reflexOperations);
    }
  } else {
    if (data.operations.length && reflexes[data.operations[0].reflexId]) {
      CableReady.perform(data.operations);
    }
  }
};

let consumer;

let params;

let subscription;

let active;

const initialize$1 = (consumerValue, paramsValue) => {
  consumer = consumerValue;
  params = paramsValue;
  document.addEventListener("DOMContentLoaded", (() => {
    active = false;
    connectionStatusClass();
    if (Deprecate.enabled && consumerValue) console.warn("Deprecation warning: the next version of StimulusReflex will obtain a reference to consumer via the Stimulus application object.\nPlease add 'application.consumer = consumer' to your index.js after your Stimulus application has been established, and remove the consumer key from your StimulusReflex initialize() options object.");
  }));
  document.addEventListener("turbolinks:load", connectionStatusClass);
  document.addEventListener("turbo:load", connectionStatusClass);
};

const subscribe = controller => {
  if (subscription) return;
  consumer = consumer || controller.application.consumer || createConsumer();
  const {channel: channel} = controller.StimulusReflex;
  const request = {
    channel: channel,
    ...params
  };
  const identifier = JSON.stringify(request);
  subscription = consumer.subscriptions.findAll(identifier)[0] || consumer.subscriptions.create(request, {
    received: received,
    connected: connected,
    rejected: rejected,
    disconnected: disconnected
  });
};

const connected = () => {
  active = true;
  connectionStatusClass();
  emitEvent("stimulus-reflex:connected");
  Object.values(reflexes.queued).forEach((reflex => {
    subscription.send(reflex.data);
    dispatchLifecycleEvent(reflex, "delivered");
  }));
};

const rejected = () => {
  active = false;
  connectionStatusClass();
  emitEvent("stimulus-reflex:rejected");
  if (Debug.enabled) console.warn("Channel subscription was rejected.");
};

const disconnected = willAttemptReconnect => {
  active = false;
  connectionStatusClass();
  emitEvent("stimulus-reflex:disconnected", willAttemptReconnect);
};

const deliver = reflex => {
  if (active) {
    subscription.send(reflex.data);
    dispatchLifecycleEvent(reflex, "delivered");
  } else dispatchLifecycleEvent(reflex, "queued");
};

const connectionStatusClass = () => {
  const list = document.body.classList;
  if (!(list.contains("stimulus-reflex-connected") || list.contains("stimulus-reflex-disconnected"))) {
    list.add(active ? "stimulus-reflex-connected" : "stimulus-reflex-disconnected");
    return;
  }
  if (active) {
    list.replace("stimulus-reflex-disconnected", "stimulus-reflex-connected");
  } else {
    list.replace("stimulus-reflex-connected", "stimulus-reflex-disconnected");
  }
};

var ActionCableTransport = {
  subscribe: subscribe,
  deliver: deliver,
  initialize: initialize$1
};

const beforeDOMUpdate = event => {
  const {stimulusReflex: stimulusReflex} = event.detail || {};
  if (!stimulusReflex) return;
  const reflex = reflexes[stimulusReflex.id];
  reflex.pendingOperations--;
  if (reflex.pendingOperations > 0) return;
  if (!stimulusReflex.resolveLate) setTimeout((() => reflex.promise.resolve({
    element: reflex.element,
    event: event,
    data: reflex.data,
    payload: reflex.payload,
    id: reflex.id,
    toString: () => ""
  })));
  setTimeout((() => dispatchLifecycleEvent(reflex, "success")));
};

const afterDOMUpdate = event => {
  const {stimulusReflex: stimulusReflex} = event.detail || {};
  if (!stimulusReflex) return;
  const reflex = reflexes[stimulusReflex.id];
  reflex.completedOperations++;
  reflex.selector = event.detail.selector;
  reflex.morph = event.detail.stimulusReflex.morph;
  reflex.operation = event.type.split(":")[1].split("-").slice(1).join("_");
  Log.success(reflex);
  if (reflex.completedOperations < reflex.totalOperations) return;
  if (stimulusReflex.resolveLate) setTimeout((() => reflex.promise.resolve({
    element: reflex.element,
    event: event,
    data: reflex.data,
    payload: reflex.payload,
    id: reflex.id,
    toString: () => ""
  })));
  setTimeout((() => dispatchLifecycleEvent(reflex, "finalize")));
  if (reflex.piggybackOperations.length) CableReady.perform(reflex.piggybackOperations);
};

const routeReflexEvent = event => {
  const {stimulusReflex: stimulusReflex, name: name} = event.detail || {};
  const eventType = name.split("-")[2];
  const eventTypes = {
    nothing: nothing,
    halted: halted,
    forbidden: forbidden,
    error: error
  };
  if (!stimulusReflex || !Object.keys(eventTypes).includes(eventType)) return;
  const reflex = reflexes[stimulusReflex.id];
  reflex.completedOperations++;
  reflex.pendingOperations--;
  reflex.selector = event.detail.selector;
  reflex.morph = event.detail.stimulusReflex.morph;
  reflex.operation = event.type.split(":")[1].split("-").slice(1).join("_");
  if (eventType === "error") reflex.error = event.detail.error;
  eventTypes[eventType](reflex, event);
  setTimeout((() => dispatchLifecycleEvent(reflex, eventType)));
  if (reflex.piggybackOperations.length) CableReady.perform(reflex.piggybackOperations);
};

const nothing = (reflex, event) => {
  Log.success(reflex);
  setTimeout((() => reflex.promise.resolve({
    data: reflex.data,
    element: reflex.element,
    event: event,
    payload: reflex.payload,
    id: reflex.id,
    toString: () => ""
  })));
};

const halted = (reflex, event) => {
  Log.halted(reflex, event);
  setTimeout((() => reflex.promise.resolve({
    data: reflex.data,
    element: reflex.element,
    event: event,
    payload: reflex.payload,
    id: reflex.id,
    toString: () => ""
  })));
};

const forbidden = (reflex, event) => {
  Log.forbidden(reflex, event);
  setTimeout((() => reflex.promise.resolve({
    data: reflex.data,
    element: reflex.element,
    event: event,
    payload: reflex.payload,
    id: reflex.id,
    toString: () => ""
  })));
};

const error = (reflex, event) => {
  Log.error(reflex, event);
  setTimeout((() => reflex.promise.reject({
    data: reflex.data,
    element: reflex.element,
    event: event,
    payload: reflex.payload,
    id: reflex.id,
    error: reflex.error,
    toString: () => reflex.error
  })));
};

const localReflexControllers = element => attributeValues(element.getAttribute(Schema.controller)).reduce(((memo, name) => {
  const controller = Stimulus.app.getControllerForElementAndIdentifier(element, name);
  if (controller && controller.StimulusReflex) memo.push(controller);
  return memo;
}), []);

const allReflexControllers = element => {
  let controllers = [];
  while (element) {
    controllers = controllers.concat(localReflexControllers(element));
    element = element.parentElement;
  }
  return controllers;
};

const findControllerByReflexName = (reflexName, controllers) => {
  const controller = controllers.find((controller => {
    if (!controller.identifier) return;
    return extractReflexName(reflexName).replace(/([a-z0–9])([A-Z])/g, "$1-$2").replace(/(::)/g, "--").toLowerCase() === controller.identifier;
  }));
  return controller || controllers[0];
};

const scanForReflexes = debounce((() => {
  const reflexElements = document.querySelectorAll(`[${Schema.reflex}]`);
  reflexElements.forEach((element => scanForReflexesOnElement(element)));
  emitEvent("stimulus-reflex:ready");
}), 20);

const scanForReflexesOnElement = element => {
  const controllerAttribute = element.getAttribute(Schema.controller);
  const controllers = attributeValues(controllerAttribute);
  const reflexAttribute = element.getAttribute(Schema.reflex);
  const reflexAttributeNames = attributeValues(reflexAttribute);
  const actionAttribute = element.getAttribute(Schema.action);
  const actions = attributeValues(actionAttribute).filter((action => !action.includes("#__perform")));
  reflexAttributeNames.forEach((reflexName => {
    const controller = findControllerByReflexName(reflexName, allReflexControllers(element));
    const controllerName = controller ? controller.identifier : "stimulus-reflex";
    actions.push(`${reflexName.split("->")[0]}->${controllerName}#__perform`);
    controllers.push(controllerName);
  }));
  const controllerValue = attributeValue(controllers);
  const actionValue = attributeValue(actions);
  if (controllerValue && element.getAttribute(Schema.controller) != controllerValue) {
    element.setAttribute(Schema.controller, controllerValue);
  }
  if (actionValue && element.getAttribute(Schema.action) != actionValue) {
    element.setAttribute(Schema.action, actionValue);
  }
};

class StimulusReflexController extends Controller {
  constructor(...args) {
    super(...args);
    register(this);
  }
}

const tabId = uuidv4();

const initialize = (application, {controller: controller, consumer: consumer, debug: debug, params: params, isolate: isolate, deprecate: deprecate, transport: transport} = {}) => {
  Transport.set(transport || ActionCableTransport);
  Transport.plugin.initialize(consumer, params);
  IsolationMode.set(!!isolate);
  Stimulus.set(application);
  Schema.set(application);
  Stimulus.app.register("stimulus-reflex", controller || StimulusReflexController);
  Debug$1.set(!!debug);
  if (typeof deprecate !== "undefined") Deprecate.set(deprecate);
  const observer = new MutationObserver(scanForReflexes);
  observer.observe(document.documentElement, {
    attributeFilter: [ Schema.reflex, Schema.action ],
    childList: true,
    subtree: true
  });
  emitEvent("stimulus-reflex:initialized");
};

const register = (controller, options = {}) => {
  const channel = "StimulusReflex::Channel";
  controller.StimulusReflex = {
    ...options,
    channel: channel
  };
  Transport.plugin.subscribe(controller);
  Object.assign(controller, {
    stimulate() {
      const url = location.href;
      const controllerElement = this.element;
      const args = Array.from(arguments);
      const target = args.shift() || "StimulusReflex::Reflex#default_reflex";
      const reflexElement = getReflexElement(args, controllerElement);
      if (elementInvalid(reflexElement)) {
        if (Debug$1.enabled) console.warn("Reflex aborted: invalid numeric input");
        return;
      }
      const options = getReflexOptions(args);
      const reflexData = new ReflexData(options, reflexElement, controllerElement, this.identifier, Schema.reflexPermanent, target, args, url, tabId);
      const id = reflexData.id;
      controllerElement.reflexController = controllerElement.reflexController || {};
      controllerElement.reflexData = controllerElement.reflexData || {};
      controllerElement.reflexError = controllerElement.reflexError || {};
      controllerElement.reflexController[id] = this;
      controllerElement.reflexData[id] = reflexData.valueOf();
      const reflex = new Reflex(reflexData, this);
      reflexes[id] = reflex;
      this.lastReflex = reflex;
      dispatchLifecycleEvent(reflex, "before");
      setTimeout((() => {
        const {params: params} = controllerElement.reflexData[id] || {};
        const check = reflexElement.attributes[Schema.reflexSerializeForm];
        if (check) {
          options["serializeForm"] = check.value !== "false";
        }
        const form = reflexElement.closest(reflexData.formSelector) || document.querySelector(reflexData.formSelector) || reflexElement.closest("form");
        if (Deprecate.enabled && options["serializeForm"] === undefined && form) console.warn(`Deprecation warning: the next version of StimulusReflex will not serialize forms by default.\nPlease set ${Schema.reflexSerializeForm}="true" on your Reflex Controller Element or pass { serializeForm: true } as an option to stimulate.`);
        const formData = options["serializeForm"] === false ? "" : serializeForm(form, {
          element: reflexElement
        });
        reflex.data = {
          ...reflexData.valueOf(),
          params: params,
          formData: formData
        };
        controllerElement.reflexData[id] = reflex.data;
        Transport.plugin.deliver(reflex);
      }));
      Log.request(reflex);
      return reflex.getPromise;
    },
    __perform(event) {
      let element = event.target;
      let reflex;
      while (element && !reflex) {
        reflex = element.getAttribute(Schema.reflex);
        if (!reflex || !reflex.trim().length) element = element.parentElement;
      }
      const match = attributeValues(reflex).find((reflex => reflex.split("->")[0] === event.type));
      if (match) {
        event.preventDefault();
        event.stopPropagation();
        this.stimulate(match.split("->")[1], element);
      }
    }
  });
  if (!controller.reflexes) Object.defineProperty(controller, "reflexes", {
    get() {
      return new Proxy(reflexes, {
        get: function(target, prop) {
          if (prop === "last") return this.lastReflex;
          return Object.fromEntries(Object.entries(target[prop]).filter((([_, reflex]) => reflex.controller === this)));
        }.bind(this)
      });
    }
  });
  scanForReflexesOnElement(controller.element);
  emitEvent("stimulus-reflex:registered", {
    detail: {
      controller: controller
    }
  });
};

const useReflex = (controller, options = {}) => {
  register(controller, options);
};

document.addEventListener("cable-ready:after-dispatch-event", routeReflexEvent);

document.addEventListener("cable-ready:before-inner-html", beforeDOMUpdate);

document.addEventListener("cable-ready:before-morph", beforeDOMUpdate);

document.addEventListener("cable-ready:after-inner-html", afterDOMUpdate);

document.addEventListener("cable-ready:after-morph", afterDOMUpdate);

document.addEventListener("readystatechange", (() => {
  if (document.readyState === "complete") {
    scanForReflexes();
  }
}));

var StimulusReflex = Object.freeze({
  __proto__: null,
  initialize: initialize,
  register: register,
  useReflex: useReflex,
  reflexes: reflexes,
  scanForReflexes: scanForReflexes,
  scanForReflexesOnElement: scanForReflexesOnElement
});

const global = {
  version: packageInfo.version,
  ...StimulusReflex,
  get debug() {
    return Debug$1.value;
  },
  set debug(value) {
    Debug$1.set(!!value);
  },
  get deprecate() {
    return Deprecate.value;
  },
  set deprecate(value) {
    Deprecate.set(!!value);
  }
};

window.StimulusReflex = global;

export { global as default, initialize, reflexes, register, scanForReflexes, scanForReflexesOnElement, useReflex };
