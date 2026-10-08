-- ============================================
-- DAY 6 ASSIGNMENT
-- School Database
-- ============================================

-- Enable foreign key enforcement in SQLite
PRAGMA foreign_keys = ON;

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Students table
CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- Courses table
CREATE TABLE courses (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
);

-- Enrolments table
-- This is the join table between students and courses.
CREATE TABLE enrolments (
    id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,

    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),

    -- Prevent the same student from enrolling
    -- in the same course more than once.
    UNIQUE (student_id, course_id)
);

-- ============================================
-- 2. INSERT SAMPLE STUDENTS
-- ============================================

INSERT INTO students (id, name, email)
VALUES
    (1, 'John Kamau', 'john@example.com'),
    (2, 'Mary Wanjiku', 'mary@example.com'),
    (3, 'Peter Otieno', 'peter@example.com'),
    (4, 'Grace Achieng', 'grace@example.com');

-- ============================================
-- 3. INSERT SAMPLE COURSES
-- ============================================

INSERT INTO courses (id, name, description)
VALUES
    (1, 'Web Development', 'HTML, CSS, JavaScript and web development'),
    (2, 'Database Systems', 'Introduction to SQL and database design'),
    (3, 'Computer Networks', 'Fundamentals of computer networking');

-- ============================================
-- 4. INSERT SAMPLE ENROLMENTS
-- ============================================

INSERT INTO enrolments (id, student_id, course_id, grade)
VALUES
    (1, 1, 1, 'A'),
    (2, 1, 2, 'B'),
    (3, 2, 1, 'A'),
    (4, 2, 3, 'B'),
    (5, 3, 2, 'C');

-- ============================================
-- 5. REQUIRED QUERIES
-- ============================================

-- Query 1:
-- Find all courses taken by one student by name.
-- Example: John Kamau

SELECT
    students.name AS student,
    courses.name AS course,
    enrolments.grade
FROM students
JOIN enrolments
    ON students.id = enrolments.student_id
JOIN courses
    ON courses.id = enrolments.course_id
WHERE students.name = 'John Kamau';


-- Query 2:
-- Find all students enrolled in one course.
-- Example: Web Development

SELECT
    students.name AS student,
    students.email
FROM students
JOIN enrolments
    ON students.id = enrolments.student_id
JOIN courses
    ON courses.id = enrolments.course_id
WHERE courses.name = 'Web Development';


-- Query 3:
-- Find the number of students enrolled in each course.

SELECT
    courses.name AS course,
    COUNT(enrolments.student_id) AS number_of_students
FROM courses
LEFT JOIN enrolments
    ON courses.id = enrolments.course_id
GROUP BY courses.id, courses.name;


-- Query 4:
-- Find students who have no enrolments.

SELECT
    students.id,
    students.name,
    students.email
FROM students
LEFT JOIN enrolments
    ON students.id = enrolments.student_id
WHERE enrolments.student_id IS NULL;


-- Query 5:
-- Update one student's enrolment grade.
-- Change Peter Otieno's Database Systems grade from C to B.

UPDATE enrolments
SET grade = 'B'
WHERE student_id = 3
  AND course_id = 2;

-- Check the updated grade
SELECT
    students.name AS student,
    courses.name AS course,
    enrolments.grade
FROM enrolments
JOIN students
    ON students.id = enrolments.student_id
JOIN courses
    ON courses.id = enrolments.course_id
WHERE student_id = 3
  AND course_id = 2;

  -- ============================================
-- OPTIONAL PERFORMANCE INDEX
-- ============================================

CREATE INDEX idx_enrolments_student_id
ON enrolments(student_id);