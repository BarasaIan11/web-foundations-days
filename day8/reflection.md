# Course Reflection

The most difficult concept in this course was designing for concurrency: understanding that two requests can read the same “available” seat before either one writes a result. I overcame it by breaking the checkout process into small steps and asking what could happen if each step ran twice or at the same time. Learning about database transactions, row locks, unique constraints, and idempotency made the solution much clearer. Instead of trusting what the page displays, I learned that the database must make the final decision about whether a seat is still available.

Based on the feedback to make my designs clearer and more explicit about failures, I would improve the capstone by adding monitoring details and clearer diagrams for the retry paths. For example, I would specify alerts for payment failures, queue delays, failed seat-hold transactions, and database latency. I would also make the waiting-room rules more concrete, including how users receive a place in line and how long their access lasts.

Next, I will learn more about building and deploying a full-stack application. I want to practise turning a design into a real project with a backend API, a relational database, authentication, automated tests, and cloud deployment. That will help me connect system-design decisions to working code and observe how performance and reliability change in practice.
