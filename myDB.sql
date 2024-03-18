-- Users table quearies 

/* create table users(
    id TEXT NOT NULL PRIMARY KEY,
    first_name VARCHAR(250),
    last_name VARCHAR(250),
    email_id VARCHAR(250),
    phone_number VARCHAR(250),
    password text NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(100)
); */

--SELECT name FROM sqlite_master;

/*INSERT INTO users 
    (id, first_name, last_name, email_id, phone_number, password, date_of_birth, gender)
VALUES (2, 'prem', 'kanth', 'premkanth@gmail.com', '9089674534', 'Premkanth@19', 02-02-1999, 'Male'); */


--PRAGMA foreign_keys = ON;

-- user addtional details 

--PRAGMA foreign_keys = ON;

/* create table user_additional_details (
    id INT NOT NULL PRIMARY KEY,
    user_id INT,
    username VARCHAR(250),
    bio TEXT,
    relationship_status VARCHAR(250),
    profile_photo TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
); */

/* create table friend_request_table (
    friend_request_table_id INT NOT NULL PRIMARY KEY,
    request_sent_by INT,
    request_sent_to INT,
    time_date DATETIME,
    FOREIGN KEY (request_sent_by) REFERENCES user_additional_details(user_id) ON DELETE CASCADE,
    FOREIGN KEY (request_sent_to) REFERENCES user_additional_details(user_id) ON DELETE CASCADE
); */

--select * from friend_request_table;
--delete from friend_request_table;

/*SELECT * FROM friend_request_table 
INNER JOIN user_additional_details
ON friend_request_table.request_sent_by = user_additional_details.user_id
                                                WHERE friend_request_table.request_sent_to = '51e7b0cb-7ed6-493d-89b1-738d5ddf3401'*/

--delete from users where first_name = ''; */

/*create table followers_table (
    id INT PRIMARY KEY NOT NULL,
    followers INT,
    followings INT,
    FOREIGN KEY (followers) REFERENCES user_additional_details(user_id) ON DELETE CASCADE,
    FOREIGN KEY (followings) REFERENCES user_additional_details(user_id) ON DELETE CASCADE
); */

--delete from users where id = 'aa6b08a8-469f-4382-8bd1-a496e5b43270';

select * from followers_table;
--delete from followers_table where id = '4065a907-de16-4f74-ba72-162c990bdf3a';

--SELECT * from user_additional_details;

--SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';

--SELECT name FROM sqlite_temp_master;

--delete from user_additional_details where username = 'res hi';

/* CREATE TABLE status_of_users (
    status_id INT PRIMARY KEY NOT NULL,
    user_id INT,
    video_path TEXT,
    caption TEXT,
    start_time INT,
    end_time INT,
    time_date DATETIME,
    FOREIGN KEY (user_id) REFERENCES user_additional_details(user_id) ON DELETE CASCADE
); */

--SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';
--delete from followers_table;
--SELECT * FROM friend_request_table;

/*CREATE TABLE posts (
    post_id INT PRIMARY KEY NOT NULL,
    user_id INT,
    post_path TEXT,
    caption Text,
    hash_tags BLOB,
    post_security TEXT,
    time_data_of_post DATETIME,
    FOREIGN KEY (user_id) REFERENCES user_additional_details(user_id) ON DELETE CASCADE
);*/

--SELECT * FROM posts;

/* CREATE TABLE likes (
    like_id INT PRIMARY KEY NOT NULL,
    post_id INT,
    user_id INT,
    time_of_like DATETIME,
    FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user_additional_details(user_id) ON DELETE CASCADE
); */

--select * from posts;

--delete from posts;

/*CREATE TABLE comments (
comment_id INT PRIMARY KEY NOT NULL,
post_id INT,
user_id INT,
comment_content TEXT,
time_of_comment DATETIME,
FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
FOREIGN KEY (user_id) REFERENCES user_additional_details(user_id) ON DELETE CASCADE
);*/

--select * from comments

/*CREATE TABLE messaged_users (
    messaged_user_table_id INR PRIMARY KEY NOT NULL,
    main_user INT,
    messaged_user_id INT,
    last_message INT,
    last_message_time DATETIME,
    FOREIGN KEY (messaged_user_id) REFERENCES user_additional_details(user_id) ON DELETE CASCADE
); */


/*CREATE TABLE messages (
    message_id INT PRIMARY KEY NOT NULL,
    message_sent_by INT,
    message_sent_too INT,
    message_content TEXT,
    message_type TEXT,
    message_sent_time DATETIME,
    FOREIGN KEY (message_sent_by) REFERENCES user_additional_details(user_id) ON DELETE CASCADE,
    FOREIGN KEY (message_sent_too) REFERENCES user_additional_details(user_id) on DELETE CASCADE
)*/

--delete from followers_table;
--delete from messaged_users;
--SELECT * FROM messages
--delete from messages;
--select * from messaged_users

/*CREATE TABLE messages_delete (
    message_delete_table_id INT PRIMARY KEY NULL,
    message_id INT,
    deleted_by INT,
    FOREIGN KEY (message_id) REFERENCES messages(message_id) ON DELETE CASCADE
); */

--select * from messages_delete;
--delete from messages_delete;

--select * from status_of_users;
--delete from status_of_users

/* CREATE TABLE notifications (
    notification_id INT PRIMARY KEY NOT NULL,
    notification_by INT,
    notification_too INT,
    post_id INT,
    notification_type TEXT,
    notification_text TEXT,
    notification_time DATETIME,
    FOREIGN KEY (notification_by) REFERENCES user_additional_details(user_id) ON DELETE CASCADE,
    FOREIGN KEY (notification_too) REFERENCES user_additional_details(user_id) ON DELETE CASCADE
); */


--select * from notifications