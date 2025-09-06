import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import inherits from 'inherits-browser';
import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';

export default {
  __init__: [ 'attachBoundaryBehavior', 'attachBoundaryRules', 'attachBoundaryContextPad' ],
  attachBoundaryBehavior: [ 'type', AttachBoundaryBehavior ],
  attachBoundaryRules: [ 'type', AttachBoundaryRules ],
  attachBoundaryContextPad: [ 'type', AttachBoundaryContextPad ]
};

// --- Utilities ---

function isBoundaryLike(shape) {
  // During creation the element may be a plain shape with businessObject.type set
  const bo = shape.businessObject;
  return is(bo, 'bpmn:BoundaryEvent');
}

function isAttachHost(target) {
  return isAny(target, [
    'bpmn:Task',
    'bpmn:SubProcess',
    'bpmn:CallActivity',
    'bpmn:Transaction'
  ]);
}

// --- Rules: allow shape.attach and create.canExecute='attach' ---

function AttachBoundaryRules(eventBus) {
  RuleProvider.call(this, eventBus);
}

inherits(AttachBoundaryRules, RuleProvider);

AttachBoundaryRules.prototype.init = function() {
  this.addRule('shape.attach', (context) => {
    const { shape, target } = context;
    if (!shape || !target) return false;
    if (!isBoundaryLike(shape)) return false;
    return isAttachHost(target) ? 'attach' : false;
  });

  this.addRule('create.canExecute', (context) => {
    const { shape, target } = context;
    if (!shape || !target) return null;
    if (!isBoundaryLike(shape)) return null;
    return isAttachHost(target) ? 'attach' : false;
  });
};
AttachBoundaryRules.$inject = [ 'eventBus' ];

// --- Behavior: snap hint + finalize attach on drop ---

function AttachBoundaryBehavior(eventBus, canvas, modeling, rules, graphicsFactory) {
  let lastHover, lastDecision;

  // show / remove hover markers
  function mark(target, add) {
    if (!target) return;
    const MARKER = 'drop-ok';
    add ? canvas.addMarker(target, MARKER) : canvas.removeMarker(target, MARKER);
  }

  // during drag
  eventBus.on('create.move', 900, (evt) => {
    const ctx = evt.context;
    const { shape, hover } = ctx;
    if (!shape) return;

    if (isBoundaryLike(shape) && hover && isAttachHost(hover)) {
      const decision = rules.allowed('create.canExecute', { shape, target: hover });
      ctx.canExecute = decision; // 'attach' or false
      lastDecision = decision;

      // visual affordance
      if (hover !== lastHover) {
        mark(lastHover, false);
        mark(hover, decision === 'attach');
        lastHover = hover;
      }

      // snap the boundary to the host edge: keep a small offset so the DI lands nicely
      if (decision === 'attach') {
        const hostGfx = canvas.getGraphics(hover);
        const hostBounds = hover; // has x,y,width,height

        // naive edge snap: stick to bottom edge; bpmn-js will refine DI on attach
        const PAD = 6;
        ctx.x = hostBounds.x + Math.min(
          Math.max(evt.x, hostBounds.x + PAD),
          hostBounds.x + hostBounds.width - PAD
        );
        ctx.y = hostBounds.y + hostBounds.height + PAD; // just below edge for nice preview
      }
    } else {
      // clear markers when leaving host
      if (lastHover) {
        mark(lastHover, false);
        lastHover = null;
      }
      lastDecision = null;
      // let default snapping handle other shapes
    }
  });

  // on drop
  eventBus.on('create.end', 900, (evt) => {
    const ctx = evt.context;
    const { shape, target, position } = ctx;

    // cleanup markers
    mark(lastHover, false);
    lastHover = null;

    if (isBoundaryLike(shape) && target && lastDecision === 'attach') {
      // create attached with modeling API (this sets attachedToRef + DI)
      modeling.createShape(shape, position, target, { attach: true });
      // prevent default creation (we already created)
      return false;
    }
    // otherwise, let default create run
  });
}
AttachBoundaryBehavior.$inject = [ 'eventBus', 'canvas', 'modeling', 'rules', 'graphicsFactory' ];

// --- Context pad entries to spawn specific boundary events quickly ---

function AttachBoundaryContextPad(contextPad, elementFactory, create, modeling) {
  contextPad.registerProvider({
    getContextPadEntries(element) {
      if (!isAttachHost(element)) return {};

      function makeBoundary(type, defType) {
        return function(event) {
          const shape = elementFactory.createShape({
            type: 'bpmn:BoundaryEvent',
            eventDefinitionType: defType // e.g. 'bpmn:ErrorEventDefinition'
          });
          // start create; our behavior will snap+attach when hovering host
          create.start(event, shape, { source: element });
        };
      }

      return {
        'append.boundary-error': {
          group: 'events',
          className: 'bpmn-icon-intermediate-event-catch-error',
          title: 'Attach Error Boundary Event',
          action: { click: makeBoundary('bpmn:BoundaryEvent', 'bpmn:ErrorEventDefinition') }
        },
        'append.boundary-timer': {
          group: 'events',
          className: 'bpmn-icon-intermediate-event-catch-timer',
          title: 'Attach Timer Boundary Event',
          action: { click: makeBoundary('bpmn:BoundaryEvent', 'bpmn:TimerEventDefinition') }
        },
        'append.boundary-escalation': {
          group: 'events',
          className: 'bpmn-icon-intermediate-event-catch-escalation',
          title: 'Attach Escalation Boundary Event',
          action: { click: makeBoundary('bpmn:BoundaryEvent', 'bpmn:EscalationEventDefinition') }
        },
        'append.boundary-message': {
          group: 'events',
          className: 'bpmn-icon-intermediate-event-catch-message',
          title: 'Attach Message Boundary Event',
          action: { click: makeBoundary('bpmn:BoundaryEvent', 'bpmn:MessageEventDefinition') }
        },
        'append.boundary-signal': {
          group: 'events',
          className: 'bpmn-icon-intermediate-event-catch-signal',
          title: 'Attach Signal Boundary Event',
          action: { click: makeBoundary('bpmn:BoundaryEvent', 'bpmn:SignalEventDefinition') }
        }
      };
    }
  });
}
AttachBoundaryContextPad.$inject = [ 'contextPad', 'elementFactory', 'create', 'modeling' ];
