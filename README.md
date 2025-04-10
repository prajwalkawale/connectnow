# connectnow
About ConnectNow is a real-time video conferencing web app built with WebRTC, Socket.IO, and MERN stack. It enables seamless audio-video communication with a modern, responsive UI.
ConnectNow
image

Secure video meetings for everyone
A real-time WebRTC-based video conferencing platform with no time limits.

Live Demo License

🌟 Features
Real-time Communication: High-quality audio and video conferencing
No Time Limits: Host meetings for as long as you need
Multiple Participants: Connect with your whole team seamlessly
Secure Meetings: End-to-end encrypted video calls
Screen Sharing: Share your screen with participants
Responsive Design: Works on desktop and mobile devices
Camera Switching: Toggle between front and rear cameras on mobile
Network Quality Indicator: Real-time feedback on connection quality
Microphone Status: Visual indicators for audio status
📱 Screenshots
image image

🛠️ Technologies Used
Frontend: HTML, CSS, JavaScript, EJS
Backend: Node.js, Express
Real-time Communication: WebRTC, Socket.IO
Database: MongoDB
Deployment: Render
🚀 Getting Started
Prerequisites
Node.js (v14 or later)
MongoDB
npm or yarn
Installation
Clone the repository

git clone https://github.com/yourusername/connectnow.git
cd connectnow
Install dependencies

npm install
Set up environment variables Create a .env file in the root directory with the following variables:

PORT=4000
ALLOWED_ORIGINS=http://localhost:4000
MONGODB_URI=your_mongodb_connection_string
Start the development server

npm run dev
Open your browser and navigate to http://localhost:4000

🎮 Usage
Creating a New Meeting
Visit the homepage and click on "Start Meeting"
Grant camera and microphone permissions when prompted
Share the meeting code or link with participants
Joining a Meeting
Visit the homepage
Enter the meeting code in the "Join Meeting" section
Click "Join Meeting"
Grant camera and microphone permissions when prompted
In-Meeting Controls
Toggle video: Turn your camera on/off
Toggle audio: Mute/unmute your microphone
Switch camera: Change between front and back cameras (mobile only)
Share screen: Present your screen to all participants
Leave meeting: Exit the conference room
🔍 Features in Detail
Network Quality Indicator
The application monitors connection quality in real-time and provides visual feedback:

Excellent (Green): Low latency, minimal packet loss
Good (Blue): Acceptable latency, low packet loss
Fair (Yellow): Moderate latency, some packet loss
Poor (Red): High latency, significant packet loss
Screen Sharing
Share your screen with a single click:

Automatically adjusts display for optimal viewing
Maintains audio connection while sharing
Seamlessly returns to camera view when finished
Mobile Responsiveness
The interface adapts to different screen sizes:

Optimized controls for touch devices
Camera switching for mobile devices
Responsive video grid that adjusts based on participant count
💡 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

Fork the repository
Create your feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add some amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request
📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgements
WebRTC - For the real-time communication technology
Socket.IO - For the signaling mechanism
EJS - For the templating engine
Icons by Font Awesome

Contributors
1.Prajwal Kawale
2.Bapu Shinde
