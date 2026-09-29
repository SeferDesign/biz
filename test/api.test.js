import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

test('GET /v1/invoices returns an invoice list', async () => {
  const app = createApp();

  const response = await request(app).get('/v1/invoices');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});
