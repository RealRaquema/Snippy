# Snippy

Snippy is a collaborative real-time code editor that allows users to create and join coding sessions. It is built using modern web technologies like React, Vite, and Socket.IO.

## Features

- **Real-Time Collaboration**: Edit code in real-time with other users in the same session.
- **Session Management**: Create new sessions or join existing ones using a session ID.
- **Dark Theme**: A visually appealing dark theme for better user experience.
- **Responsive Design**: Works seamlessly across devices and screen sizes.

## Project Structure

```
client/
  src/
    pages/
      Home.jsx         # Home page with session creation and joining options
      CodeEditor.jsx   # Real-time collaborative code editor
      JoinSession.jsx  # Component for joining existing sessions
      img.jpg          # Image used in the Home page
    App.jsx            # Main application component
    main.jsx           # Entry point for the React app
  vite.config.js       # Vite configuration file
  package.json         # Client dependencies and scripts

server/
  index.js             # Express server with Socket.IO for real-time communication
  models/
    CodeSession.js     # Mongoose model for session data
  package.json         # Server dependencies and scripts
```

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (running locally or remotely)

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/BecomeFaisal/Snippy.git
   cd Snippy
   ```

2. Install dependencies for both client and server:
   ```bash
   cd client
   npm install
   cd ../server
   npm install
   ```

3. Start the server:
   ```bash
   cd server
   node index.js
   ```

4. Start the client:
   ```bash
   cd client
   npm run dev
   ```

5. Open the application in your browser at `http://localhost:5173`.

## Usage

- **Create a New Session**: Click the "Create New Code Session" button on the home page to start a new session.
- **Join an Existing Session**: Enter the session ID in the input field and click "Join Session".
- **Collaborate**: Share the session ID with others to collaborate in real-time.

## Technologies Used

- **Frontend**: React, Vite, CodeMirror
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MongoDB

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
