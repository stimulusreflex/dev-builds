(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("@hotwired/stimulus"), require("cable_ready"), require("@rails/actioncable")) : typeof define === "function" && define.amd ? define([ "exports", "@hotwired/stimulus", "cable_ready", "@rails/actioncable" ], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, 
  factory(global.StimulusReflex = {}, global.Stimulus, global.CableReady, global.actioncable));
})(this, (function(exports, stimulus, CableReady, actioncable) {
  "use strict";
  function _interopDefaultLegacy(e) {
    return e && typeof e === "object" && "default" in e ? e : {
      default: e
    };
  }
  var CableReady__default = _interopDefaultLegacy(CableReady);
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
        Object.defineProperty(this, attribute.slice(0, -9), {
          get: () => schema[attribute]
        });
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
  const reflexes = {};
  const request = (reflexId, target, args, controller, element, controllerElement) => {
    const reflex = reflexes[reflexId];
    if (Debug$1.disabled || reflex.promise.data.suppressLogging) return;
    reflex.timestamp = new Date;
    console.log(`↑ stimulus ↑ ${target}`, {
      reflexId: reflexId,
      args: args,
      controller: controller,
      element: element,
      controllerElement: controllerElement
    });
  };
  const success = (event, halted) => {
    const {detail: detail} = event || {};
    const {selector: selector, payload: payload} = detail || {};
    const {reflexId: reflexId, target: target, morph: morph} = detail.stimulusReflex || {};
    const reflex = reflexes[reflexId];
    if (Debug$1.disabled || reflex.promise.data.suppressLogging) return;
    const progress = reflex.totalOperations > 1 ? ` ${reflex.completedOperations}/${reflex.totalOperations}` : "";
    const duration = reflex.timestamp ? `in ${new Date - reflex.timestamp}ms` : "CLONED";
    const operation = event.type.split(":")[1].split("-").slice(1).join("_");
    console.log(`↓ reflex ↓ ${target} → ${selector || "∞"}${progress} ${duration}`, {
      reflexId: reflexId,
      morph: morph,
      operation: operation,
      halted: halted,
      payload: payload
    });
  };
  const error$1 = event => {
    const {detail: detail} = event || {};
    const {reflexId: reflexId, target: target, payload: payload} = detail.stimulusReflex || {};
    const reflex = reflexes[reflexId];
    if (Debug$1.disabled || reflex.promise.data.suppressLogging) return;
    const duration = reflex.timestamp ? `in ${new Date - reflex.timestamp}ms` : "CLONED";
    console.log(`↓ reflex ↓ ${target} ${duration} %cERROR: ${event.detail.body}`, "color: #f00;", {
      reflexId: reflexId,
      payload: payload
    });
  };
  var Log = {
    request: request,
    success: success,
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
    let ix = 0;
    const siblings = element?.parentNode ? element.parentNode.childNodes : [];
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
  const multipleInstances = element => {
    if ([ "checkbox", "radio" ].includes(element.type)) {
      return document.querySelectorAll(`input[type="${element.type}"][name="${element.name}"]`).length > 1;
    }
    return false;
  };
  const collectCheckedOptions = element => Array.from(element.querySelectorAll("option:checked")).concat(Array.from(document.querySelectorAll(`input[type="${element.type}"][name="${element.name}"]`)).filter((elem => elem.checked))).map((o => o.value));
  const attributeValue = (values = []) => {
    const value = values.filter((v => v && String(v).length)).map((v => v.trim())).join(" ").trim();
    return value.length ? value : null;
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
  let isolationMode = false;
  var IsolationMode = {
    get disabled() {
      return !isolationMode;
    },
    set(value) {
      isolationMode = value;
    }
  };
  const invokeLifecycleMethod = (stage, reflexElement, controllerElement, reflexId, payload) => {
    if (!controllerElement || !controllerElement.reflexData[reflexId]) return;
    const controller = controllerElement.reflexController[reflexId];
    const reflex = controllerElement.reflexData[reflexId].target;
    const reflexMethodName = reflex.split("#")[1];
    const specificLifecycleMethodName = [ "before", "after", "finalize" ].includes(stage) ? `${stage}${camelize(reflexMethodName)}` : `${camelize(reflexMethodName, false)}${camelize(stage)}`;
    const specificLifecycleMethod = controller[specificLifecycleMethodName];
    const genericLifecycleMethodName = [ "before", "after", "finalize" ].includes(stage) ? `${stage}Reflex` : `reflex${camelize(stage)}`;
    const genericLifecycleMethod = controller[genericLifecycleMethodName];
    if (typeof specificLifecycleMethod === "function") {
      specificLifecycleMethod.call(controller, reflexElement, reflex, controllerElement.reflexError[reflexId], reflexId, payload);
    }
    if (typeof genericLifecycleMethod === "function") {
      genericLifecycleMethod.call(controller, reflexElement, reflex, controllerElement.reflexError[reflexId], reflexId, payload);
    }
    if (reflexes[reflexId] && stage === reflexes[reflexId].finalStage) {
      Reflect.deleteProperty(controllerElement.reflexController, reflexId);
      Reflect.deleteProperty(controllerElement.reflexData, reflexId);
      Reflect.deleteProperty(controllerElement.reflexError, reflexId);
    }
  };
  document.addEventListener("stimulus-reflex:before", (event => invokeLifecycleMethod("before", event.detail.element, event.detail.controller.element, event.detail.reflexId, event.detail.payload)), true);
  document.addEventListener("stimulus-reflex:success", (event => {
    invokeLifecycleMethod("success", event.detail.element, event.detail.controller.element, event.detail.reflexId, event.detail.payload);
    dispatchLifecycleEvent("after", event.detail.element, event.detail.controller.element, event.detail.reflexId, event.detail.payload);
  }), true);
  document.addEventListener("stimulus-reflex:nothing", (event => {
    dispatchLifecycleEvent("success", event.detail.element, event.detail.controller.element, event.detail.reflexId, event.detail.payload);
  }), true);
  document.addEventListener("stimulus-reflex:error", (event => {
    invokeLifecycleMethod("error", event.detail.element, event.detail.controller.element, event.detail.reflexId, event.detail.payload);
    dispatchLifecycleEvent("after", event.detail.element, event.detail.controller.element, event.detail.reflexId, event.detail.payload);
  }), true);
  document.addEventListener("stimulus-reflex:halted", (event => invokeLifecycleMethod("halted", event.detail.element, event.detail.controller.element, event.detail.reflexId, event.detail.payload)), true);
  document.addEventListener("stimulus-reflex:after", (event => invokeLifecycleMethod("after", event.detail.element, event.detail.controller.element, event.detail.reflexId, event.detail.payload)), true);
  document.addEventListener("stimulus-reflex:finalize", (event => invokeLifecycleMethod("finalize", event.detail.element, event.detail.controller.element, event.detail.reflexId, event.detail.payload)), true);
  const dispatchLifecycleEvent = (stage, reflexElement, controllerElement, reflexId, payload) => {
    if (!controllerElement) {
      if (Debug$1.enabled && !reflexes[reflexId].warned) {
        console.warn(`StimulusReflex was not able execute callbacks or emit events for "${stage}" or later life-cycle stages for this Reflex. The StimulusReflex Controller Element is no longer present in the DOM. Could you move the StimulusReflex Controller to an element higher in your DOM?`);
        reflexes[reflexId].warned = true;
      }
      return;
    }
    if (!controllerElement.reflexController || controllerElement.reflexController && !controllerElement.reflexController[reflexId]) {
      if (Debug$1.enabled && !reflexes[reflexId].warned) {
        console.warn(`StimulusReflex detected that the StimulusReflex Controller responsible for this Reflex has been replaced with a new instance. Callbacks and events for "${stage}" or later life-cycle stages cannot be executed.`);
        reflexes[reflexId].warned = true;
      }
      return;
    }
    const {target: target} = controllerElement.reflexData[reflexId] || {};
    const controller = controllerElement.reflexController[reflexId] || {};
    const event = `stimulus-reflex:${stage}`;
    const action = `${event}:${target.split("#")[1]}`;
    const detail = {
      reflex: target,
      controller: controller,
      reflexId: reflexId,
      element: reflexElement,
      payload: payload
    };
    const options = {
      bubbles: true,
      cancelable: false,
      detail: detail
    };
    controllerElement.dispatchEvent(new CustomEvent(event, options));
    controllerElement.dispatchEvent(new CustomEvent(action, options));
    if (window.jQuery) {
      window.jQuery(controllerElement).trigger(event, detail);
      window.jQuery(controllerElement).trigger(action, detail);
    }
  };
  const localReflexControllers = (app, element) => attributeValues(element.getAttribute(Schema.controller)).reduce(((memo, name) => {
    const controller = app.getControllerForElementAndIdentifier(element, name);
    if (controller && controller.StimulusReflex) memo.push(controller);
    return memo;
  }), []);
  const allReflexControllers = (app, element) => {
    let controllers = [];
    while (element) {
      controllers = controllers.concat(localReflexControllers(app, element));
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
  const received = data => {
    if (!data.cableReady) return;
    if (data.version.replace(".pre", "-pre") !== CableReady__default["default"].version) {
      if (Debug$1.enabled) console.error(`Reflex failed due to cable_ready gem/NPM package version mismatch. Package versions must match exactly.\nNote that if you are using pre-release builds, gems use the "x.y.z.preN" version format, while NPM packages use "x.y.z-preN".\n\ncable_ready gem: ${data.version}\ncable_ready NPM: ${CableReady__default["default"].version}`);
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
      return;
    }
    let reflexData;
    if (reflexOperations.length) {
      reflexData = reflexOperations[0].stimulusReflex;
      reflexData.payload = reflexOperations[0].payload;
    }
    if (reflexData) {
      const {reflexId: reflexId, payload: payload} = reflexData;
      if (!reflexes[reflexId] && IsolationMode.disabled) {
        const controllerElement = XPathToElement(reflexData.xpathController);
        const reflexElement = XPathToElement(reflexData.xpathElement);
        controllerElement.reflexController = controllerElement.reflexController || {};
        controllerElement.reflexData = controllerElement.reflexData || {};
        controllerElement.reflexError = controllerElement.reflexError || {};
        controllerElement.reflexController[reflexId] = reflexes.app.getControllerForElementAndIdentifier(controllerElement, reflexData.reflexController);
        controllerElement.reflexData[reflexId] = reflexData;
        dispatchLifecycleEvent("before", reflexElement, controllerElement, reflexId, payload);
        registerReflex(reflexData);
      }
      if (reflexes[reflexId]) {
        reflexes[reflexId].totalOperations = reflexOperations.length;
        reflexes[reflexId].pendingOperations = reflexOperations.length;
        reflexes[reflexId].completedOperations = 0;
        reflexes[reflexId].piggybackOperations = data.operations;
        CableReady__default["default"].perform(reflexOperations);
      }
    } else {
      if (data.operations.length && reflexes[data.operations[0].reflexId]) {
        CableReady__default["default"].perform(data.operations);
      }
    }
  };
  const registerReflex = data => {
    const {reflexId: reflexId} = data;
    reflexes[reflexId] = {
      finalStage: "finalize"
    };
    const promise = new Promise(((resolve, reject) => {
      reflexes[reflexId].promise = {
        resolve: resolve,
        reject: reject,
        data: data
      };
    }));
    promise.reflexId = reflexId;
    if (Debug$1.enabled) promise.catch((() => {}));
    return promise;
  };
  const getReflexRoots = element => {
    let list = [];
    while (list.length === 0 && element) {
      let reflexRoot = element.getAttribute(Schema.reflexRoot);
      if (reflexRoot) {
        if (reflexRoot.length === 0 && element.id) reflexRoot = `#${element.id}`;
        const selectors = reflexRoot.split(",").filter((s => s.trim().length));
        if (Debug$1.enabled && selectors.length === 0) {
          console.error(`No value found for ${Schema.reflexRoot}. Add an #id to the element or provide a value for ${Schema.reflexRoot}.`, element);
        }
        list = list.concat(selectors.filter((s => document.querySelector(s))));
      }
      element = element.parentElement ? element.parentElement.closest(`[${Schema.reflexRoot}]`) : null;
    }
    return list;
  };
  const setupDeclarativeReflexes = debounce((() => {
    document.querySelectorAll(`[${Schema.reflex}]`).forEach((element => {
      const controllers = attributeValues(element.getAttribute(Schema.controller));
      const reflexAttributeNames = attributeValues(element.getAttribute(Schema.reflex));
      const actions = attributeValues(element.getAttribute(Schema.action));
      reflexAttributeNames.forEach((reflexName => {
        const controller = findControllerByReflexName(reflexName, allReflexControllers(reflexes.app, element));
        let action;
        if (controller) {
          action = `${reflexName.split("->")[0]}->${controller.identifier}#__perform`;
          if (!actions.includes(action)) actions.push(action);
        } else {
          action = `${reflexName.split("->")[0]}->stimulus-reflex#__perform`;
          if (!controllers.includes("stimulus-reflex")) {
            controllers.push("stimulus-reflex");
          }
          if (!actions.includes(action)) actions.push(action);
        }
      }));
      const controllerValue = attributeValue(controllers);
      const actionValue = attributeValue(actions);
      if (controllerValue && element.getAttribute(Schema.controller) != controllerValue) {
        element.setAttribute(Schema.controller, controllerValue);
      }
      if (actionValue && element.getAttribute(Schema.action) != actionValue) element.setAttribute(Schema.action, actionValue);
    }));
    emitEvent("stimulus-reflex:ready");
  }), 20);
  var version = "3.5.0-pre9";
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
    get reflexId() {
      this._reflexId = this._reflexId || this.options["reflexId"] || uuidv4();
      return this._reflexId;
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
        reflexId: this.reflexId,
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
        version: version
      };
    }
  }
  let consumer;
  let params;
  let subscriptionActive;
  const createSubscription = controller => {
    consumer = consumer || controller.application.consumer || actioncable.createConsumer();
    const {channel: channel} = controller.StimulusReflex;
    const subscription = {
      channel: channel,
      ...params
    };
    const identifier = JSON.stringify(subscription);
    controller.StimulusReflex.subscription = consumer.subscriptions.findAll(identifier)[0] || consumer.subscriptions.create(subscription, {
      received: received,
      connected: connected,
      rejected: rejected,
      disconnected: disconnected
    });
  };
  const connected = () => {
    subscriptionActive = true;
    document.body.classList.replace("stimulus-reflex-disconnected", "stimulus-reflex-connected");
    emitEvent("stimulus-reflex:connected");
    emitEvent("stimulus-reflex:action-cable:connected");
  };
  const rejected = () => {
    subscriptionActive = false;
    document.body.classList.replace("stimulus-reflex-connected", "stimulus-reflex-disconnected");
    emitEvent("stimulus-reflex:rejected");
    emitEvent("stimulus-reflex:action-cable:rejected");
    if (Debug.enabled) console.warn("Channel subscription was rejected.");
  };
  const disconnected = willAttemptReconnect => {
    subscriptionActive = false;
    document.body.classList.replace("stimulus-reflex-connected", "stimulus-reflex-disconnected");
    emitEvent("stimulus-reflex:disconnected", willAttemptReconnect);
    emitEvent("stimulus-reflex:action-cable:disconnected", willAttemptReconnect);
  };
  var ActionCableTransport = {
    consumer: consumer,
    params: params,
    get subscriptionActive() {
      return subscriptionActive;
    },
    createSubscription: createSubscription,
    connected: connected,
    rejected: rejected,
    disconnected: disconnected,
    set(consumerValue, paramsValue) {
      consumer = consumerValue;
      params = paramsValue;
    }
  };
  const beforeDOMUpdate = event => {
    const {stimulusReflex: stimulusReflex, payload: payload} = event.detail || {};
    if (!stimulusReflex) return;
    const {reflexId: reflexId, xpathElement: xpathElement, xpathController: xpathController} = stimulusReflex;
    const controllerElement = XPathToElement(xpathController);
    const reflexElement = XPathToElement(xpathElement);
    const reflex = reflexes[reflexId];
    const {promise: promise} = reflex;
    reflex.pendingOperations--;
    if (reflex.pendingOperations > 0) return;
    if (!stimulusReflex.resolveLate) setTimeout((() => promise.resolve({
      element: reflexElement,
      event: event,
      data: promise.data,
      payload: payload,
      reflexId: reflexId,
      toString: () => ""
    })));
    setTimeout((() => dispatchLifecycleEvent("success", reflexElement, controllerElement, reflexId, payload)));
  };
  const afterDOMUpdate = event => {
    const {stimulusReflex: stimulusReflex, payload: payload} = event.detail || {};
    if (!stimulusReflex) return;
    const {reflexId: reflexId, xpathElement: xpathElement, xpathController: xpathController} = stimulusReflex;
    const controllerElement = XPathToElement(xpathController);
    const reflexElement = XPathToElement(xpathElement);
    const reflex = reflexes[reflexId];
    const {promise: promise} = reflex;
    reflex.completedOperations++;
    Log.success(event, false);
    if (reflex.completedOperations < reflex.totalOperations) return;
    if (stimulusReflex.resolveLate) setTimeout((() => promise.resolve({
      element: reflexElement,
      event: event,
      data: promise.data,
      payload: payload,
      reflexId: reflexId,
      toString: () => ""
    })));
    setTimeout((() => dispatchLifecycleEvent("finalize", reflexElement, controllerElement, reflexId, payload)));
    if (reflex.piggybackOperations.length) CableReady__default["default"].perform(reflex.piggybackOperations);
  };
  const routeReflexEvent = event => {
    const {stimulusReflex: stimulusReflex, payload: payload, name: name, body: body} = event.detail || {};
    const eventType = name.split("-")[2];
    if (!stimulusReflex || ![ "nothing", "halted", "error" ].includes(eventType)) return;
    const {reflexId: reflexId, xpathElement: xpathElement, xpathController: xpathController} = stimulusReflex;
    const reflexElement = XPathToElement(xpathElement);
    const controllerElement = XPathToElement(xpathController);
    const reflex = reflexes[reflexId];
    const {promise: promise} = reflex;
    if (controllerElement) {
      controllerElement.reflexError = controllerElement.reflexError || {};
      if (eventType === "error") controllerElement.reflexError[reflexId] = body;
    }
    switch (eventType) {
     case "nothing":
      nothing(event, payload, promise, reflex, reflexElement);
      break;

     case "error":
      error(event, payload, promise, reflex, reflexElement);
      break;

     case "halted":
      halted(event, payload, promise, reflex, reflexElement);
      break;
    }
    setTimeout((() => dispatchLifecycleEvent(eventType, reflexElement, controllerElement, reflexId, payload)));
    if (reflex.piggybackOperations.length) CableReady__default["default"].perform(reflex.piggybackOperations);
  };
  const nothing = (event, payload, promise, reflex, reflexElement) => {
    reflex.finalStage = "after";
    Log.success(event, false);
    setTimeout((() => promise.resolve({
      data: promise.data,
      element: reflexElement,
      event: event,
      payload: payload,
      reflexId: promise.data.reflexId,
      toString: () => ""
    })));
  };
  const halted = (event, payload, promise, reflex, reflexElement) => {
    reflex.finalStage = "halted";
    Log.success(event, true);
    setTimeout((() => promise.resolve({
      data: promise.data,
      element: reflexElement,
      event: event,
      payload: payload,
      reflexId: promise.data.reflexId,
      toString: () => ""
    })));
  };
  const error = (event, payload, promise, reflex, reflexElement) => {
    reflex.finalStage = "after";
    Log.error(event);
    setTimeout((() => promise.reject({
      data: promise.data,
      element: reflexElement,
      event: event,
      payload: payload,
      reflexId: promise.data.reflexId,
      error: event.detail.body,
      toString: () => event.detail.body
    })));
  };
  class StimulusReflexController extends stimulus.Controller {
    constructor(...args) {
      super(...args);
      register(this);
    }
  }
  const initialize = (application, {controller: controller, consumer: consumer, debug: debug, params: params, isolate: isolate, deprecate: deprecate} = {}) => {
    ActionCableTransport.set(consumer, params);
    document.addEventListener("DOMContentLoaded", (() => {
      document.body.classList.remove("stimulus-reflex-connected");
      document.body.classList.add("stimulus-reflex-disconnected");
      if (Deprecate.enabled && consumer) console.warn("Deprecation warning: the next version of StimulusReflex will obtain a reference to consumer via the Stimulus application object.\nPlease add 'application.consumer = consumer' to your index.js after your Stimulus application has been established, and remove the consumer key from your StimulusReflex initialize() options object.");
      if (Deprecate.enabled && IsolationMode.disabled) console.warn("Deprecation warning: the next version of StimulusReflex will standardize isolation mode, and the isolate option will be removed.\nPlease update your applications to assume that every tab will be isolated.");
    }), {
      once: true
    });
    IsolationMode.set(!!isolate);
    reflexes.app = application;
    Schema.set(application);
    reflexes.app.register("stimulus-reflex", controller || StimulusReflexController);
    Debug$1.set(!!debug);
    if (typeof deprecate !== "undefined") Deprecate.set(deprecate);
    const observer = new MutationObserver(setupDeclarativeReflexes);
    observer.observe(document.documentElement, {
      attributeFilter: [ Schema.reflex, Schema.action ],
      childList: true,
      subtree: true
    });
  };
  const register = (controller, options = {}) => {
    const channel = "StimulusReflex::Channel";
    controller.StimulusReflex = {
      ...options,
      channel: channel
    };
    ActionCableTransport.createSubscription(controller);
    Object.assign(controller, {
      isActionCableConnectionOpen() {
        return this.StimulusReflex.subscription.consumer.connection.isOpen();
      },
      stimulate() {
        const url = location.href;
        const args = Array.from(arguments);
        const target = args.shift() || "StimulusReflex::Reflex#default_reflex";
        const controllerElement = this.element;
        const reflexElement = args[0] && args[0].nodeType === Node.ELEMENT_NODE ? args.shift() : controllerElement;
        if (reflexElement.type === "number" && reflexElement.validity && reflexElement.validity.badInput) {
          if (Debug$1.enabled) console.warn("Reflex aborted: invalid numeric input");
          return;
        }
        const options = {};
        if (args[0] && typeof args[0] === "object" && Object.keys(args[0]).filter((key => [ "attrs", "selectors", "reflexId", "resolveLate", "serializeForm", "suppressLogging", "includeInnerHTML", "includeTextContent" ].includes(key))).length) {
          const opts = args.shift();
          Object.keys(opts).forEach((o => options[o] = opts[o]));
        }
        const reflexData = new ReflexData(options, reflexElement, controllerElement, this.identifier, Schema.reflexPermanent, target, args, url, tabId);
        const reflexId = reflexData.reflexId;
        if (!this.isActionCableConnectionOpen()) throw "The ActionCable connection is not open! `this.isActionCableConnectionOpen()` must return true before calling `this.stimulate()`";
        if (!ActionCableTransport.subscriptionActive) throw "The ActionCable channel subscription for StimulusReflex was rejected.";
        controllerElement.reflexController = controllerElement.reflexController || {};
        controllerElement.reflexData = controllerElement.reflexData || {};
        controllerElement.reflexError = controllerElement.reflexError || {};
        controllerElement.reflexController[reflexId] = this;
        controllerElement.reflexData[reflexId] = reflexData.valueOf();
        dispatchLifecycleEvent("before", reflexElement, controllerElement, reflexId);
        setTimeout((() => {
          const {params: params} = controllerElement.reflexData[reflexId] || {};
          const check = reflexElement.attributes[Schema.reflexSerializeForm];
          if (check) {
            options["serializeForm"] = check.value !== "false";
          }
          const form = reflexElement.closest(reflexData.formSelector) || document.querySelector(reflexData.formSelector) || reflexElement.closest("form");
          if (Deprecate.enabled && options["serializeForm"] === undefined && form) console.warn(`Deprecation warning: the next version of StimulusReflex will not serialize forms by default.\nPlease set ${Schema.reflexSerializeForm}="true" on your Reflex Controller Element or pass { serializeForm: true } as an option to stimulate.`);
          const formData = options["serializeForm"] === false ? "" : serializeForm(form, {
            element: reflexElement
          });
          controllerElement.reflexData[reflexId] = {
            ...reflexData.valueOf(),
            params: params,
            formData: formData
          };
          this.StimulusReflex.subscription.send(controllerElement.reflexData[reflexId]);
        }));
        const promise = registerReflex(reflexData.valueOf());
        Log.request(reflexId, target, args, this.context.scope.identifier, reflexElement, controllerElement);
        return promise;
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
  };
  const tabId = uuidv4();
  const useReflex = (controller, options = {}) => {
    register(controller, options);
  };
  document.addEventListener("cable-ready:after-dispatch-event", routeReflexEvent);
  document.addEventListener("cable-ready:before-inner-html", beforeDOMUpdate);
  document.addEventListener("cable-ready:before-morph", beforeDOMUpdate);
  document.addEventListener("cable-ready:after-inner-html", afterDOMUpdate);
  document.addEventListener("cable-ready:after-morph", afterDOMUpdate);
  window.addEventListener("load", setupDeclarativeReflexes);
  var StimulusReflex = Object.freeze({
    __proto__: null,
    initialize: initialize,
    register: register,
    useReflex: useReflex
  });
  const global = {
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
  exports["default"] = global;
  exports.initialize = initialize;
  exports.register = register;
  exports.useReflex = useReflex;
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
}));
