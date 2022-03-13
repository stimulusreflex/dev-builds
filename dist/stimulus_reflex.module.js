import "@hotwired/stimulus";

import CableReady from "cable_ready";

import "@rails/actioncable";

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

const reflexes = {};

const request = (reflexId, target, args, controller, element, controllerElement) => {};

const success = (event, halted) => {
  const {detail: detail} = event || {};
  detail.stimulusReflex || {};
  return;
};

const error$1 = event => {
  const {detail: detail} = event || {};
  detail.stimulusReflex || {};
  return;
};

var Log = {
  request: request,
  success: success,
  error: error$1
};

const uuidv4 = () => {
  const crypto = window.crypto || window.msCrypto;
  return ([ 1e7 ] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)));
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

const XPathToElement = xpath => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

const attributeValue = (values = []) => {
  const value = values.filter((v => v && String(v).length)).map((v => v.trim())).join(" ").trim();
  return value.length ? value : null;
};

const attributeValues = value => {
  if (!value) return [];
  if (!value.length) return [];
  return value.split(" ").filter((v => v.trim().length));
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
    return;
  }
  if (!controllerElement.reflexController || controllerElement.reflexController && !controllerElement.reflexController[reflexId]) {
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
  if (reflex.piggybackOperations.length) CableReady.perform(reflex.piggybackOperations);
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
  if (reflex.piggybackOperations.length) CableReady.perform(reflex.piggybackOperations);
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

uuidv4();

document.addEventListener("cable-ready:after-dispatch-event", routeReflexEvent);

document.addEventListener("cable-ready:before-inner-html", beforeDOMUpdate);

document.addEventListener("cable-ready:before-morph", beforeDOMUpdate);

document.addEventListener("cable-ready:after-inner-html", afterDOMUpdate);

document.addEventListener("cable-ready:after-morph", afterDOMUpdate);

window.addEventListener("load", setupDeclarativeReflexes);
//# sourceMappingURL=stimulus_reflex.module.js.map
