import request from 'supertest';
import {describe, expect, it} from 'vitest';
import {app} from './app.js';

describe('GET /api/health', () => {
  it('returns API health', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('also supports the versioned health endpoint', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {service: 'cartly-api', status: 'ok'},
    });
  });
});
