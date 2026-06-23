# Node.js & MongoDB Project

This project is built with Node.js and MongoDB.

## Prerequisites

Before running the project, make sure you have installed:

- Node.js
- npm
- MongoDB (running locally or accessible through a connection string)

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory and add the required environment variables:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

## Running the Application

Start the application:

```bash
npm start
```

The server will start on the port specified in your `.env` file.

## Project Structure

```text
.
├── index.html
├── package.json
├── .env
└── README.md
```

## Troubleshooting

If you encounter dependency issues, try:

```bash
rm -rf node_modules package-lock.json
npm install
```

## License

This project is licensed under the MIT License.
