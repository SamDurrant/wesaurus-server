BEGIN;

TRUNCATE
  word,
  we_user,
  settings,
  definition,
  saved_word,
  saved_definition
  RESTART IDENTITY CASCADE;

INSERT INTO word (text)
VALUES
  ('Memory Leak'),
  ('Encapsulation'),
  ('Function Declaration'),
  ('Primitive Type'),
  ('Lexical Environment'),
  ('Call Stack'),
  ('Pure Function');

INSERT INTO we_user (user_name, email, password)
VALUES
  ('wordgirl', 'wordgirl@email.com', '$2a$12$CsAnvkko7LgzG5GV7Pod4uLwuhgGrOswKVs4K9JXObHhp82zR4jSW'),
  ('huckleberry', 'huckleberry@finn.com', '$2a$12$dbNXsY4Nzyr4LrpZVu4nleGhLwiPC6DMvoAY8NVRsgRPzAJE2KA92');

INSERT INTO settings (user_id)
VALUES
  (1),
  (2);

INSERT INTO definition (author_id, word_id, text)
VALUES
  (1, 1, 'Pieces of memory that the application has used in the past but is not needed any longer but has not yet been returned back to us.'),
  (2, 1, 'When memory is allocated, but not deallocated, a memory leak occurs. If too many memory leaks occur, they can usurp all of memory and bring everything to a halt or slow the processing considerably.'),
  (1, 2, 'Involves grouping functionality together. Bundling state and methods that interact with state, restricting access from outside this bundle.'),
  (2, 3, 'A function that starts with the function keyword. Hoisted and defined when the compiler initially looks at code.'),
  (2, 4, 'Data that only represents a single value - eg. numbers, booleans, strings, undefined, null, Symbol.'),
  (2, 5, 'Refers to where you write something. If a compiler knows where code is written it can decide and make decisions as to where to put things and what actions to take, what a function has access to'),
  (1, 6, 'Where the engine keeps track of where your code is in its execution. A place to run code in order and keep track of what is happening line by line on our code. Operates as first in, last out. Stores function and variables as your code executes at each entry state of the stack.'),
  (1, 7, 'A function that has no side effects like affecting another part of a program and always return something based on an input. Same input results in same output.');

INSERT INTO saved_word (user_id, word_id)
VALUES
  (1, 1),
  (1, 3),
  (1, 6),
  (2, 1),
  (2, 5);

INSERT INTO saved_definition (user_id, definition_id)
VALUES
  (1, 2),
  (1, 4),
  (2, 1);

COMMIT;