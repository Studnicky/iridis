/**
 * FramingSurface uses measured luminance to choose the requested surface.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PaletteStateInterface } from '../../src/interfaces/PaletteStateInterface.ts';

import { InputEntity } from '../../src/entities/InputEntity.ts';
import { RuntimeOptionsEntity } from '../../src/entities/RuntimeOptionsEntity.ts';
import { colorRecordFactory } from '../../src/math/ColorRecordFactory.ts';
import { FramingSurface } from '../../src/model/FramingSurface.ts';

class FramingSurfaceFixture {
  static readonly darkBackground = colorRecordFactory.fromHex('#0d1117');
  static readonly lightBackground = colorRecordFactory.fromHex('#f2f2f2');

  static state(
    roles: PaletteStateInterface['roles'],
    variants: PaletteStateInterface['variants'],
    runtime: PaletteStateInterface['runtime']
  ): PaletteStateInterface {
    const input = InputEntity.intake({ 'colors': [] });
    return {
      'colors':   [],
      'input':    input,
      'metadata': {},
      'outputs':  {},
      'roles':    roles,
      'runtime':  runtime,
      'variants': variants
    };
  }

  static unframedSurface(
    roles: PaletteStateInterface['roles'],
    variants: PaletteStateInterface['variants']
  ) {
    const result = FramingSurface.resolve(this.state(roles, variants, RuntimeOptionsEntity.intake({})));
    return result;
  }

  static darkSurface(
    roles: PaletteStateInterface['roles'],
    variants: PaletteStateInterface['variants']
  ) {
    const result = FramingSurface.resolve(this.state(roles, variants, RuntimeOptionsEntity.intake({ 'framing': 'dark' })));
    return result;
  }

  static lightSurface(
    roles: PaletteStateInterface['roles'],
    variants: PaletteStateInterface['variants']
  ) {
    const result = FramingSurface.resolve(this.state(roles, variants, RuntimeOptionsEntity.intake({ 'framing': 'light' })));
    return result;
  }
}

await test('FramingSurface recognizes a dark background', () => {
  assert.equal(FramingSurface.isLight({ 'background': FramingSurfaceFixture.darkBackground }), false);
});

await test('FramingSurface recognizes a light background', () => {
  assert.equal(FramingSurface.isLight({ 'background': FramingSurfaceFixture.lightBackground }), true);
});

await test('FramingSurface treats a missing background as dark', () => {
  assert.equal(FramingSurface.isLight({}), false);
});

await test('FramingSurface preserves roles when framing is omitted', () => {
  const roles = { 'background': FramingSurfaceFixture.darkBackground };
  const variants = {
    'dark':  { 'background': FramingSurfaceFixture.lightBackground },
    'light': { 'background': FramingSurfaceFixture.darkBackground }
  };
  assert.equal(FramingSurfaceFixture.unframedSurface(roles, variants), roles);
});

await test('FramingSurface keeps matching measured appearance', () => {
  const roles = { 'background': FramingSurfaceFixture.darkBackground };
  const variants = {
    'dark':  { 'background': FramingSurfaceFixture.lightBackground },
    'light': { 'background': FramingSurfaceFixture.darkBackground }
  };
  const resolved = FramingSurfaceFixture.darkSurface(roles, variants);
  assert.equal(resolved, roles);
  assert.equal(FramingSurface.isLight(resolved), false);
});

await test('FramingSurface chooses a variant by measured appearance', () => {
  const roles = { 'background': FramingSurfaceFixture.darkBackground };
  const lightVariant = { 'background': FramingSurfaceFixture.lightBackground };
  const variants = {
    'dark':  lightVariant,
    'light': { 'background': FramingSurfaceFixture.darkBackground }
  };
  const resolved = FramingSurfaceFixture.lightSurface(roles, variants);
  assert.equal(resolved, lightVariant);
  assert.equal(FramingSurface.isLight(resolved), true);
});

await test('FramingSurface falls back to roles when no variant matches', () => {
  const roles = { 'background': FramingSurfaceFixture.darkBackground };
  assert.equal(FramingSurfaceFixture.lightSurface(roles, {}), roles);
});
