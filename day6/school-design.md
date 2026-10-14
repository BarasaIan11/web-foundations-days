# School Database Design

## Tables

- **students** stores one record per learner, including a unique email address used to identify and contact that student.
- **courses** stores the courses the school offers, with a readable course name and a unique course code.
- **enrolments** records a student's registration on a particular course and stores the grade they receive.

## Relationships

A student can have many enrolments, so the relationship from **students** to **enrolments** is one-to-many. A course can also have many enrolments, so the relationship from **courses** to **enrolments** is one-to-many. Together, students and courses have a many-to-many relationship: one student can take several courses and one course can have several students. The **enrolments** join table is needed to represent each student-course pair once and to keep information that belongs to that pairing, such as the grade.

## Index

I would add an index on `enrolments(course_id)` because staff will often look up all students registered for a particular course. The index makes that join and filter faster as the enrolments table grows.

## SQL or NoSQL

I would choose SQL for this system because the data has clear relationships and needs strong consistency. Foreign keys prevent enrolments from pointing to missing students or courses, and the unique student-course rule prevents duplicate registrations. SQL also makes reporting queries, such as student counts for every course, straightforward and reliable.
