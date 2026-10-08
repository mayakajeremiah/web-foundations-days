# School Database Design

## Students Table

The `students` table stores information about students in the school. Each student has a unique `id`, a name, and an email address. The `id` is the primary key, while the email address is also unique so that two students cannot register using the same email address.

## Courses Table

The `courses` table stores information about the courses offered by the school. Each course has a unique `id`, a name, and a description. The `id` is the primary key of the table.

## Enrolments Table

The `enrolments` table records which students are taking which courses. It contains its own primary key, as well as `student_id` and `course_id`, which are foreign keys referencing the `students` and `courses` tables. It also stores the student's grade for that course.

## Relationships

There is a one-to-many relationship between `students` and `enrolments` because one student can have many enrolment records, while each enrolment belongs to one student. There is also a one-to-many relationship between `courses` and `enrolments` because one course can have many enrolment records, while each enrolment belongs to one course.

Students and courses have a many-to-many relationship because one student can take many courses, and one course can have many students. A join table called `enrolments` is needed to represent this relationship. The `enrolments` table connects students and courses using foreign keys and also stores information about the relationship, such as the student's grade. A `UNIQUE (student_id, course_id)` constraint prevents the same student from enrolling in the same course twice.

## Index

I would add an index on `enrolments(student_id)` because student enrolment information will frequently be searched using a student's ID. An index can make these searches and JOIN operations faster, especially as the number of students and enrolments grows.

```sql
CREATE INDEX idx_enrolments_student_id
ON enrolments(student_id);
```

## SQL or NoSQL?

I would choose SQL for this school system because the data has clear relationships between students, courses, and enrolments. SQL databases are well suited to structured data and allow us to use primary keys, foreign keys, unique constraints, JOINs, and transactions to maintain data integrity. The school system also needs queries such as finding all courses for a student and counting students per course, which are straightforward with SQL. A relational database such as SQLite is therefore a good choice for this system.