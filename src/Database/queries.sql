-- Create the database
CREATE DATABASE aero;

-- Select the database to use
USE aero;

-- Create the blocked_token table
CREATE TABLE blocked_token (
    id INT AUTO_INCREMENT PRIMARY KEY,
    access_token VARCHAR(512) NOT NULL,
    user_id INT NOT NULL,
    device_id VARCHAR(128) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refresh_token VARCHAR(255),
    access_token VARCHAR(255)
);

-- Create the files table
CREATE TABLE files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_name VARCHAR(255),
    file_name VARCHAR(255),
    extension VARCHAR(50),
    mime_type VARCHAR(100),
    size INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
