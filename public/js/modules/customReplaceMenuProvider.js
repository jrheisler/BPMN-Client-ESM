import ReplaceMenuProvider from 'bpmn-js/lib/features/popup-menu/ReplaceMenuProvider.js';
import { is } from 'bpmn-js/lib/util/ModelUtil.js';

export class CustomReplaceMenuProvider extends ReplaceMenuProvider {
  constructor(
    bpmnFactory,
    popupMenu,
    modeling,
    moddle,
    bpmnReplace,
    rules,
    translate,
    moddleCopy
  ) {
    super(
      bpmnFactory,
      popupMenu,
      modeling,
      moddle,
      bpmnReplace,
      rules,
      translate,
      moddleCopy
    );
  }

  getPopupMenuEntries(target) {
    const businessObject = target.businessObject;
    const entries = super.getPopupMenuEntries(target);

    if (is(businessObject, 'bpmn:StartEvent') && !is(businessObject.$parent, 'bpmn:SubProcess')) {
      delete entries['replace-with-none-intermediate-throwing'];
      delete entries['replace-with-none-end'];
    }

    return entries;
  }
}

CustomReplaceMenuProvider.$inject = ReplaceMenuProvider.$inject;

export default {
  __init__: ['replaceMenuProvider'],
  replaceMenuProvider: ['type', CustomReplaceMenuProvider]
};
