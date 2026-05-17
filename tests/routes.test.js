jest.mock('../src/lib/prisma', () => ({
  story: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  contactSubmission: {
    create: jest.fn(),
  },
}));

jest.mock('../src/lib/email', () => ({
  handleContactSubmission: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const { handleContactSubmission } = require('../src/lib/email');

describe('Route tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('returns a healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Server is running',
      });
    });
  });

  describe('GET /stories', () => {
    it('returns story data with pagination', async () => {
      const story = {
        id: 'story-1',
        type: 'video',
        title: 'Test Story',
        category: 'Education',
        thumbnailUrl: 'https://example.com/test.jpg',
        thumbnailPublicId: null,
        featured: true,
        duration: '05:00',
        location: 'Nigeria',
        createdAt: new Date().toISOString(),
      };

      prisma.story.findMany.mockResolvedValue([story]);
      prisma.story.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/stories')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([story]);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 12,
        total: 1,
        pages: 1,
      });
    });

    it('returns validation error for invalid query params', async () => {
      const response = await request(app)
        .get('/stories?limit=0')
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });

  describe('POST /contact', () => {
    it('accepts a valid contact submission', async () => {
      handleContactSubmission.mockResolvedValueOnce({
        submission: { id: 'submission-1' },
        emailSent: false,
      });

      const response = await request(app)
        .post('/contact')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          subject: 'Hello',
          message: 'This is a test message.',
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(handleContactSubmission).toHaveBeenCalledWith(
        'Jane Doe',
        'jane@example.com',
        'Hello',
        'This is a test message.',
      );
      expect(response.body).toMatchObject({
        success: true,
        message: 'Message saved, will be sent shortly',
        data: {
          id: 'submission-1',
          emailSent: false,
        },
      });
    });

    it('rejects invalid contact payloads', async () => {
      const response = await request(app)
        .post('/contact')
        .send({
          name: 'J',
          email: 'invalid-email',
          subject: '',
          message: 'Hi',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });
  });
});
