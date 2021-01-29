const { expect } = require('chai');
const knex = require('knex');
const supertest = require('supertest');
const app = require('../src/app');

const makeBookmarksArray = require('./bookmarks.fixtures');

describe('Bookmarks Endpoints', function () {
  let db;
  before('make knex db instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db);
  });

  before('clean up the table', () => db('bookmarks').truncate());

  after('disconnect from database', () => db.destroy());

  afterEach('cleanup after test', () => db('bookmarks').truncate());

  describe('GET /api/bookmarks', () => {
    context('given that there are no bookmarks in the table', () => {
      it('should return 200 and an empty array', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .expect(200, []);
      });
    });

    context('given that there bookmarks in the table', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks into table', () => {
        return db.into('bookmarks').insert(testBookmarks);
      });

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .expect(200, testBookmarks);
      });
    });
  });

  describe('GET /api/bookmarks/:id', () => {
    context('given that the bookmark does not exist', () => {
      it('responds with 404', () => {
        const bookmarkId = 12345;
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .expect(404, {
            error: { message: `Bookmark with id ${bookmarkId} not found` },
          });
      });
    });

    context('given that the bookmark exists', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks into table', () => {
        return db.into('bookmarks').insert(testBookmarks);
      });

      it('responds with 200 and the requested bookmark', () => {
        const bookmarkId = 6;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .expect(200, expectedBookmark);
      });
    });
  });

  describe('DELETE /api/bookmarks/:id', () => {
    context('given that the bookmark does not exist', () => {
      it('responds with 404', () => {
        const bookmarkId = 12345;
        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .expect(404, {
            error: { message: `bookmark with id ${bookmarkId} not found` },
          });
      });
    });

    context('given that the bookmark does exist', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks into table', () => {
        return db.into('bookmarks').insert(testBookmarks);
      });
      it('should return 204 and remove the bookmarks', () => {
        const idToDrop = 6;
        const expectedBookmarks = testBookmarks.filter(
          (bookmark) => bookmark.id !== idToDrop
        );

        return supertest(app)
          .delete(`/api/bookmarks/${idToDrop}`)
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .expect(204)
          .then((response) => {
            return supertest(app)
              .get(`/api/bookmarks/${idToDrop}`)
              .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
              .expect(404);
          })
          .then((response) => {
            return supertest(app)
              .get('/api/bookmarks')
              .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
              .expect(expectedBookmarks);
          });
      });
    });
  });

  describe('POST /api/bookmarks', () => {
    it('creates a new bookmark, responding with 201 and the new bookmark', function () {
      const newBookmark = {
        title: 'title test',
        url: 'url8.com test',
        description: 'long description test',
        rating: 5,
      };

      return supertest(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
        .send(newBookmark)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).to.equal(newBookmark.title);
          expect(res.body.url).to.equal(newBookmark.url);
          expect(res.body.description).to.equal(newBookmark.description);
          expect(res.body.rating).to.equal(newBookmark.rating);
          expect(res.body).to.have.property('id');
        });
    });

    const requiredFields = ['title', 'url', 'description', 'rating'];

    requiredFields.forEach((field) => {
      const newBookmark = {
        title: 'title test',
        url: 'url8.com test',
        description: 'long description test',
        rating: 5,
      };

      it(`responds with 400 and an error if the field ${field} is missing`, () => {
        delete newBookmark[field];

        return supertest(app)
          .post('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .send(newBookmark)
          .expect(400);
      });
    });
  });

  describe.only('PATCH /api/bookmarks/:id', () => {
    context('given no bookmarks', () => {
      it('responds with 404', () => {
        const bookmarkId = 12345;
        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .expect(404, {
            error: { message: `Bookmark with id ${bookmarkId} not found` },
          });
      });
    });

    context('given that there are bookmarks', () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach('insert bookmarks into table', () => {
        return db.into('bookmarks').insert(testBookmarks);
      });

      it('responds with a 204 and updates the bookmark when patch request succeeds', () => {
        const bookmarkIdToUpdate = 3;
        const newBookmarkDetails = {
          title: 'updated title',
          url: 'updated url',
          description: 'updated description',
          rating: 5,
        };

        const expectedBookmark = {
          id: bookmarkIdToUpdate,
          ...newBookmarkDetails,
        };

        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkIdToUpdate}`)
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .send(newBookmarkDetails)
          .expect(204)
          .then((res) => {
            return supertest(app)
              .get(`/api/bookmarks/${bookmarkIdToUpdate}`)
              .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
              .expect(expectedBookmark);
          });
      });

      it('responds with a 400 and error message when no values are supplied', () => {
        const bookmarkIdToUpdate = 3;
        const newBookmarkDetails = {
          badField: 'bad info, not what is expected',
        };

        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkIdToUpdate}`)
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .send(newBookmarkDetails)
          .expect(400, {
            error: {
              message:
                "Request body must contain either 'title' 'url' 'rating' or 'description'",
            },
          });
      });

      it('responds with a 204 when updating only a specific field', () => {
        const bookmarkIdToUpdate = 2;
        const newBookmarkDetails = {
          title: 'updated title',
        };

        const expectedBookmark = {
          ...testBookmarks[bookmarkIdToUpdate - 1],
          ...newBookmarkDetails,
        };

        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkIdToUpdate}`)
          .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
          .send(newBookmarkDetails)
          .expect(204)
          .then((res) => {
            return supertest(app)
              .get(`/api/bookmarks/${bookmarkIdToUpdate}`)
              .set('Authorization', `Bearer ${process.env.REACT_APP_API_KEY}`)
              .expect(expectedBookmark);
          });
      });
    });
  });
});
