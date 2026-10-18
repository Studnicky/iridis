import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderBubble } from '../app/theme/particles/renderBubble.ts';
import { renderDot } from '../app/theme/particles/renderDot.ts';
import { renderHeart } from '../app/theme/particles/renderHeart.ts';
import { renderSquare } from '../app/theme/particles/renderSquare.ts';
import { renderStar } from '../app/theme/particles/renderStar.ts';
import { renderStreak } from '../app/theme/particles/renderStreak.ts';

class ParticleRendererFixture {
  static readonly input = { 'blur': '1px', 'colorVar': 'var(--ui-primary)', 'count': 3, 'sizePx': 8 };
}

await test('dot renderer produces only the box-shadow particle surface', () => {
  const output = renderDot.render(ParticleRendererFixture.input);

  assert.equal(output.rendering.surface, 'box-shadow');
  if (output.rendering.surface !== 'box-shadow') {
    throw new TypeError('Dot renderer must select the box-shadow particle surface.');
  }
  assert.equal('elements' in output.rendering, false);
  assert.equal(output.rendering.boxShadow.includes(ParticleRendererFixture.input.colorVar), true);
});

await test('element renderers produce only positioned particle elements', () => {
  const renderers = [renderBubble, renderHeart, renderSquare, renderStar, renderStreak];

  for (let index = 0; index < renderers.length; index += 1) {
    const renderer = renderers[index];
    if (renderer === undefined) {
      throw new RangeError('Particle renderer is missing.');
    }
    const output = renderer.render(ParticleRendererFixture.input);
    assert.equal(output.rendering.surface, 'elements');
    if (output.rendering.surface !== 'elements') {
      throw new TypeError('Element renderer must select the elements particle surface.');
    }
    assert.equal('boxShadow' in output.rendering, false);
    assert.equal(output.rendering.elements.length, ParticleRendererFixture.input.count);
  }
});
