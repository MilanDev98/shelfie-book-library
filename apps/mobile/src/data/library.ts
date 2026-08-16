export type LibraryBook = {
  id: string;
  title: string;
  author: string;
  spineColor: string;
  edition: string;
  format: string;
  published: string;
  pages: string;
  isbn: string;
  genre: string;
  description: string;
};

export const libraryBooks: LibraryBook[] = [
  {
    id: '1984',
    title: '1984',
    author: 'George Orwell',
    spineColor: '#7E4A3A',
    edition: 'Penguin Modern Classics',
    format: 'Paperback',
    published: '1949',
    pages: '328 pages',
    isbn: '9780451524935',
    genre: 'Dystopian fiction',
    description: 'A classic novel about surveillance, language, and the quiet power of independent thought.',
  },
  {
    id: 'dune',
    title: 'Dune',
    author: 'Frank Herbert',
    spineColor: '#2F5E58',
    edition: 'Ace Anniversary Edition',
    format: 'Paperback',
    published: '1965',
    pages: '688 pages',
    isbn: '9780441172719',
    genre: 'Science fiction',
    description: 'An epic story of power, ecology, and destiny set across the desert planet Arrakis.',
  },
  {
    id: 'midnight-library',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    spineColor: '#B27B3C',
    edition: 'Viking Paperback',
    format: 'Paperback',
    published: '2020',
    pages: '304 pages',
    isbn: '9780525559474',
    genre: 'Contemporary fiction',
    description: 'A moving story about regret, possibility, and the lives that exist between choices.',
  },
  {
    id: 'normal-people',
    title: 'Normal People',
    author: 'Sally Rooney',
    spineColor: '#74634F',
    edition: 'Faber & Faber',
    format: 'Paperback',
    published: '2018',
    pages: '288 pages',
    isbn: '9780571334650',
    genre: 'Literary fiction',
    description: 'An intimate novel about connection, class, and the changing shape of a relationship.',
  },
  {
    id: 'atomic-habits',
    title: 'Atomic Habits',
    author: 'James Clear',
    spineColor: '#B6A36B',
    edition: 'Avery',
    format: 'Hardcover',
    published: '2018',
    pages: '320 pages',
    isbn: '9780735211292',
    genre: 'Self-improvement',
    description: 'A practical guide to building better habits through small, repeatable changes.',
  },
];
