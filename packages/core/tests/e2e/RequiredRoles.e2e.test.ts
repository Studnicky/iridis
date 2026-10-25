/** Required-role resolution behavior. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RoleDefinitionEntity } from '../../src/entities/RoleDefinitionEntity.ts';
import { Metadata } from '../../src/types/metadata.ts';
import { RequiredRolesHarness } from './required-roles/RequiredRolesHarness.ts';

await test('required role nudges a dark input into a high-lightness range', () => {
  const state = RequiredRolesHarness.runHex(
    ['#000000'],
    RoleDefinitionEntity.intake({ 'lightnessRange': [0.92, 1], 'name': 'canvas', 'required': true })
  );
  const role = state.roles.canvas;
  assert.ok(role !== undefined);
  assert.ok(role.oklch.l >= 0.92 && role.oklch.l <= 1);
});

await test('required role nudges a light input into a low-lightness range', () => {
  const state = RequiredRolesHarness.runHex(
    ['#ffffff'],
    RoleDefinitionEntity.intake({ 'lightnessRange': [0.05, 0.15], 'name': 'text', 'required': true })
  );
  const role = state.roles.text;
  assert.ok(role !== undefined);
  assert.ok(role.oklch.l >= 0.05 && role.oklch.l <= 0.15);
});

await test('required role retains a mid-grey input within its declared lightness range', () => {
  const state = RequiredRolesHarness.runHex(
    ['#808080'],
    RoleDefinitionEntity.intake({ 'lightnessRange': [0.4, 0.6], 'name': 'mid', 'required': true })
  );
  const role = state.roles.mid;
  assert.ok(role !== undefined);
  assert.ok(role.oklch.l >= 0.4 && role.oklch.l <= 0.6);
});

await test('required role desaturates a vivid input into a neutral chroma range', () => {
  const state = RequiredRolesHarness.runHex(
    ['#ff0000'],
    RoleDefinitionEntity.intake({ 'chromaRange': [0, 0.02], 'name': 'neutral', 'required': true })
  );
  const role = state.roles.neutral;
  assert.ok(role !== undefined);
  assert.ok(role.oklch.c >= 0 && role.oklch.c <= 0.02);
});

await test('required role keeps an achromatic input within a neutral chroma range', () => {
  const state = RequiredRolesHarness.runHex(
    ['#808080'],
    RoleDefinitionEntity.intake({ 'chromaRange': [0, 0.02], 'name': 'neutral', 'required': true })
  );
  const role = state.roles.neutral;
  assert.ok(role !== undefined);
  assert.ok(role.oklch.c >= 0 && role.oklch.c <= 0.02);
});

await test('required role rejects a retired hue offset property', () => {
  assert.throws(() => {
    RoleDefinitionEntity.intake({ 'hueOffset': 20, 'name': 'anchor', 'required': true });
  });
});

await test('required role rejects a retired source property', () => {
  assert.throws(() => {
    RoleDefinitionEntity.intake({ 'derivedFrom': 'brand', 'name': 'anchor', 'required': true });
  });
});

await test('required role applies lightness and chroma constraints together', () => {
  const state = RequiredRolesHarness.runHex(
    ['#000000', '#ffffff', '#ff00ff', '#00ff00'],
    RoleDefinitionEntity.intake({
      'chromaRange': [0.05, 0.1],
      'lightnessRange': [0.4, 0.5],
      'name': 'tight',
      'required': true
    })
  );
  const role = state.roles.tight;
  assert.ok(role !== undefined);
  assert.ok(role.oklch.l >= 0.4 && role.oklch.l <= 0.5);
  assert.ok(role.oklch.c >= 0.05 && role.oklch.c <= 0.1);
});

await test('required role synthesizes a constrained color and records provenance', () => {
  const state = RequiredRolesHarness.runHex(
    [],
    RoleDefinitionEntity.intake({
      'chromaRange': [0.1, 0.15],
      'lightnessRange': [0.6, 0.8],
      'name': 'synth',
      'required': true
    })
  );
  const role = state.roles.synth;
  const provenance = Metadata.roleProvenance(state.metadata).get('synth');
  assert.ok(role !== undefined);
  assert.ok(role.oklch.l >= 0.6 && role.oklch.l <= 0.8);
  assert.ok(role.oklch.c >= 0.1 && role.oklch.c <= 0.15);
  assert.strictEqual(provenance?.origin, 'synthesized');
  assert.match(role.hex, RequiredRolesHarness.hexPattern);
  assert.ok(role.rgb.r >= 0 && role.rgb.r <= 1);
});

await test('required role synthesizes an achromatic point-range color', () => {
  const state = RequiredRolesHarness.runHex(
    [],
    RoleDefinitionEntity.intake({
      'chromaRange': [0, 0],
      'lightnessRange': [0.5, 0.5],
      'name': 'synth',
      'required': true
    })
  );
  const role = state.roles.synth;
  assert.ok(role !== undefined);
  assert.match(role.hex, RequiredRolesHarness.hexPattern);
  assert.ok(role.rgb.r >= 0 && role.rgb.r <= 1);
});

await test('optional role resolves when an input color exists', () => {
  const state = RequiredRolesHarness.runHex(
    ['#000000'],
    RoleDefinitionEntity.intake({ 'lightnessRange': [0.85, 1], 'name': 'maybe', 'required': false })
  );
  const role = state.roles.maybe;
  assert.ok(role !== undefined);
  assert.ok(role.oklch.l >= 0.85 && role.oklch.l <= 1);
});

await test('optional role remains absent with no input colors', () => {
  const state = RequiredRolesHarness.runHex(
    [],
    RoleDefinitionEntity.intake({ 'lightnessRange': [0.85, 1], 'name': 'maybe', 'required': false })
  );
  assert.strictEqual(state.roles.maybe, undefined);
});

await test('unconstrained optional role remains absent with no input colors', () => {
  const state = RequiredRolesHarness.runHex(
    [],
    RoleDefinitionEntity.intake({ 'lightnessRange': [0.5, 0.7], 'name': 'maybe', 'required': false })
  );
  assert.strictEqual(state.roles.maybe, undefined);
});
