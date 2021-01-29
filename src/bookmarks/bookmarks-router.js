const express = require('express');
const xss = require('xss');
const logger = require('../logger');

const BookmarksService = require('./bookmarks-service');

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: bookmark.rating,
});

bookmarksRouter
  .route('/')
  .get((req, res, next) => {
    BookmarksService.getAllBookmarks(req.app.get('db')).then((data) =>
      res.json(data)
    );
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;

    if (!title) {
      logger.error('Title is required');
      return res.status(400).send('Missing title');
    }

    if (!url) {
      logger.error('URL is required');
      return res.status(400).send('Missing URL');
    }

    if (!description) {
      logger.error('Description is required');
      return res.status(400).send('Missing Description');
    }

    if (!rating || rating < 1 || rating > 5) {
      logger.error('Rating between 1 and 5 is required');
      return res.status(400).send('Rating between 1 and 5 is required');
    }

    // TODO refactor the above into a loop, then update test to be more specific

    const bookmark = {
      title,
      url,
      description,
      rating,
    };
    BookmarksService.createBookmark(req.app.get('db'), bookmark)
      .then((bookmark) => {
        return res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(serializeBookmark(bookmark));
      })
      .catch(next);
  });

bookmarksRouter
  .route('/:id')
  .all((req, res, next) => {
    BookmarksService.getBookmarkById(req.app.get('db'), req.params.id)
      .then((bookmark) => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: `Bookmark with id ${req.params.id} not found` },
          });
        }
        res.bookmark = bookmark;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    const id = req.params.id;

    BookmarksService.getBookmarkById(req.app.get('db'), id)
      .then((data) => {
        if (!data) {
          logger.error(`Bookmark with id ${id} not found`);
          return res
            .status(404)
            .json({ error: { message: `Bookmark with id ${id} not found` } });
        }
        return res.json(serializeBookmark(data));
      })
      .catch(next);
  })
  .delete((req, res, next) => {
    const { id } = req.params;

    BookmarksService.deleteBookmark(req.app.get('db'), id)
      .then((response) => {
        if (response === 0) {
          return res
            .status(404)
            .json({ error: { message: `bookmark with id ${id} not found` } });
        }
        return res.status(204).end();
      })
      .catch(next);
  })
  .patch((req, res, next) => {
    const { id } = req.params;
    const { title, url, description, rating } = req.body;
    const updatedBookmark = { title, url, description, rating };

    const numberOfValuesInBookmark = Object.values(updatedBookmark).filter(
      Boolean
    ).length;

    if (numberOfValuesInBookmark === 0) {
      return res
        .status(400)
        .json({
          error: {
            message:
              "Request body must contain either 'title' 'url' 'rating' or 'description'",
          },
        });
    }

    BookmarksService.updateBookmark(req.app.get('db'), id, updatedBookmark)
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarksRouter;
