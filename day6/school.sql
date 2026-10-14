PRAGMA foreign_keys = ON;

CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  course_name TEXT NOT NULL,
  course_code TEXT NOT NULL UNIQUE
);

CREATE TABLE enrolments (
  enrolment_id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  grade TEXT,
  FOREIGN KEY (student_id) REFERENCES students(student_id),
  FOREIGN KEY (course_id) REFERENCES courses(course_id),
  UNIQUE (student_id, course_id)
);

INSERT INTO students (student_id, full_name, email) VALUES
  (1, 'Amina Otieno', 'amina.otieno@example.com'),
  (2, 'Brian Mwangi', 'brian.mwangi@example.com'),
  (3, 'Chao Wanjiku', 'chao.wanjiku@example.com'),
  (4, 'David Kiptoo', 'david.kiptoo@example.com');

INSERT INTO courses (course_id, course_name, course_code) VALUES
  (1, 'Web Foundations', 'WEB101'),
  (2, 'Database Design', 'DBS201'),
  (3, 'JavaScript Basics', 'JS102');

INSERT INTO enrolments (enrolment_id, student_id, course_id, grade) VALUES
  (1, 1, 1, 'A'),
  (2, 1, 2, 'B+'),
  (3, 2, 1, 'B'),
  (4, 2, 3, 'A-'),
  (5, 3, 2, 'A');

-- 1. All courses for one student, selected by name.
SELECT courses.course_name, courses.course_code, enrolments.grade
FROM enrolments
JOIN students ON enrolments.student_id = students.student_id
JOIN courses ON enrolments.course_id = courses.course_id
WHERE students.full_name = 'Amina Otieno';

-- 2. All students on one course.
SELECT students.full_name, students.email, enrolments.grade
FROM enrolments
JOIN students ON enrolments.student_id = students.student_id
JOIN courses ON enrolments.course_id = courses.course_id
WHERE courses.course_name = 'Web Foundations';

-- 3. The number of students per course, including courses with no enrolments.
SELECT courses.course_name, COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments ON courses.course_id = enrolments.course_id
GROUP BY courses.course_id, courses.course_name;

-- 4. Students who have no enrolments.
SELECT students.full_name, students.email
FROM students
LEFT JOIN enrolments ON students.student_id = enrolments.student_id
WHERE enrolments.enrolment_id IS NULL;

-- 5. Update one enrolment grade.
UPDATE enrolments
SET grade = 'A+'
WHERE student_id = 2
  AND course_id = 3;
