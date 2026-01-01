import { test } from 'node:test';
import assert from 'node:assert/strict';
import { THEMES } from '../public/js/core/theme.js';

test('dark theme uses defined connection colors', () => {
  const dark = THEMES.dark;
  assert.equal(dark.bpmn.connection.stroke, '#60a5fa');
  assert.equal(dark.bpmn.marker.fill, '#60a5fa');
  assert.equal(dark.bpmn.marker.stroke, '#e2e8f0');
});
