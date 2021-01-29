const BookmarksService = {
  getAllBookmarks(db) {
    return db.select('*').from('bookmarks');
  },
  getBookmarkById(db, id) {
    return db.select('*').from('bookmarks').where('id', id).first();
  },
  createBookmark(db, bookmark) {
    return db
      .insert(bookmark)
      .into('bookmarks')
      .returning('*')
      .then((rows) => {
        return rows[0];
      });
  },
  deleteBookmark(db, id) {
    return db('bookmarks').where({ id }).delete();
  },
  updateBookmark(db, id, newBookmarkFields) {
    return db('bookmarks').where({ id }).update(newBookmarkFields);
  },
};

module.exports = BookmarksService;
