// Initialize socket.io with configuration
const socket = io({
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

// UI Elements
const videoGrid = document.getElementById('video-grid');
const loadingOverlay = document.getElementById('loading-overlay');
const errorContainer = document.getElementById('error-container');
const myVideo = document.createElement('video');
myVideo.muted = true;

// Media stream state
let myStream = null;
let isVideoEnabled = true;
let isAudioEnabled = true;
let currentCameraFacing = 'user'; // Track current camera facing mode

// Store peer connections and user IDs
const peerConnections = new Map();
const remotePeers = new Set();

// Enhanced configuration with fallback STUN servers
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { 
      urls: 'turn:numb.viagenie.ca',
      username: 'webrtc@live.com',
      credential: 'muazkh'
    }
  ],
  iceCandidatePoolSize: 10
};

// Show error message
const showError = (message) => {
  console.error(message);
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorContainer.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
};

// Show success message
const showSuccess = (message) => {
  console.log(message);
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  errorContainer.appendChild(successDiv);
  setTimeout(() => successDiv.remove(), 3000);
};

// Initialize media devices
const initializeMedia = async () => {
  try {
    console.log('Initializing media devices...');
    myStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    // Update UI to reflect successful media access
    showSuccess('Camera and microphone access granted');
    
    myVideo.srcObject = myStream;
    myVideo.addEventListener('loadedmetadata', () => {
      myVideo.play();
    });
    
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container';
    videoContainer.setAttribute('data-peer-id', 'local');
    videoContainer.appendChild(myVideo);
    
    const nameTag = document.createElement('div');
    nameTag.className = 'name-tag';
    nameTag.innerHTML = `
      <span>You</span>
      <div class="mic-status unmuted"></div>
    `;
    videoContainer.appendChild(nameTag);
    
    videoGrid.appendChild(videoContainer);

    // Set up UI controls
    setupControls();

    // Join room after initialization
    socket.emit('join-room', ROOM_ID, socket.id);
    console.log('Joining room with ID:', ROOM_ID);

  } catch (error) {
    console.error('Error accessing media devices:', error);
    showError('Please enable camera and microphone permissions!');
  }
};

// Set up UI controls
const setupControls = () => {
  const videoBtn = document.querySelector('.fa-video').parentElement;
  const audioBtn = document.querySelector('.fa-microphone').parentElement;
  const leaveBtn = document.querySelector('.fa-phone-slash').parentElement;
  const switchCameraBtn = document.getElementById('camera-switch-btn');

  videoBtn.addEventListener('click', toggleVideo);
  audioBtn.addEventListener('click', toggleAudio);
  leaveBtn.addEventListener('click', leaveRoom);

  // Only show and setup camera switch if device has multiple cameras
  if ('mediaDevices' in navigator && 'enumerateDevices' in navigator.mediaDevices) {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length > 1) {
          switchCameraBtn.style.display = 'flex';
          switchCameraBtn.addEventListener('click', switchCamera);
        }
      })
      .catch(err => {
        console.error('Error enumerating devices:', err);
      });
  }
};

// Toggle video
const toggleVideo = () => {
  if (myStream) {
    const videoTrack = myStream.getVideoTracks()[0];
    isVideoEnabled = !isVideoEnabled;
    videoTrack.enabled = isVideoEnabled;
    const btn = document.querySelector('.fa-video').parentElement;
    btn.classList.toggle('bg-red-500', !isVideoEnabled);
    btn.classList.toggle('bg-blue-500', isVideoEnabled);
  }
};

// Toggle audio
const toggleAudio = () => {
  if (myStream) {
    const audioTrack = myStream.getAudioTracks()[0];
    isAudioEnabled = !isAudioEnabled;
    audioTrack.enabled = isAudioEnabled;
    
    // Update button state
    const btn = document.querySelector('.fa-microphone').parentElement;
    btn.classList.toggle('bg-red-500', !isAudioEnabled);
    btn.classList.toggle('bg-blue-500', isAudioEnabled);
    
    // Update local mic status indicator
    const localContainer = document.querySelector('[data-peer-id="local"]');
    if (localContainer) {
      const micStatus = localContainer.querySelector('.mic-status');
      micStatus.className = `mic-status ${isAudioEnabled ? 'unmuted' : 'muted'}`;
    }
    
    // Emit audio state change to other peers
    socket.emit('audio-state-change', {
      isAudioEnabled,
      roomId: ROOM_ID
    });
  }
};

// Switch camera function
const switchCamera = async () => {
  try {
    // Toggle between front and back cameras
    currentCameraFacing = currentCameraFacing === 'user' ? 'environment' : 'user';
    
    // Get new video stream with different camera
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentCameraFacing },
      audio: true
    });
    
    // Stop all tracks on the old stream
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
    }
    
    // Replace old stream with new stream
    myStream = newStream;
    myVideo.srcObject = newStream;
    
    // Update all peer connections with the new stream
    const videoTrack = newStream.getVideoTracks()[0];
    peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track.kind === 'video');
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    });
    
    // Keep the current audio/video enabled state
    myStream.getVideoTracks()[0].enabled = isVideoEnabled;
    myStream.getAudioTracks()[0].enabled = isAudioEnabled;
    
    // Update button animation
    const switchBtn = document.getElementById('camera-switch-btn');
    switchBtn.classList.add('rotating');
    setTimeout(() => switchBtn.classList.remove('rotating'), 500);
    
    showSuccess('Camera switched successfully');
  } catch (error) {
    console.error('Error switching camera:', error);
    showError('Failed to switch camera. Please try again.');
  }
};

// Create peer connection
const createPeerConnection = (userId) => {
  console.log(`Creating peer connection for user ${userId}`);
  const peerConnection = new RTCPeerConnection(configuration);
  
  // Add stream tracks to connection
  if (myStream) {
    myStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, myStream);
      console.log(`Added ${track.kind} track to peer connection`);
    });
  } else {
    console.error('No local stream available to add to peer connection');
  }

  // ICE Candidate handling
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log(`Sending ICE candidate to ${userId}`);
      socket.emit('ice-candidate', {
        candidate: event.candidate,
        targetUserId: userId
      }, ROOM_ID);
    }
  };

  // ICE connection state changes
  peerConnection.oniceconnectionstatechange = () => {
    console.log(`ICE connection state with ${userId}: ${peerConnection.iceConnectionState}`);
    
    if (peerConnection.iceConnectionState === 'failed' || 
        peerConnection.iceConnectionState === 'disconnected') {
      showError(`Connection with peer ${userId} failed. Attempting to reconnect...`);
      peerConnection.restartIce();
    }
  };

  // Connection state handling
  peerConnection.onconnectionstatechange = () => {
    console.log(`Connection state with ${userId}: ${peerConnection.connectionState}`);
    
    if (peerConnection.connectionState === 'connected') {
      showSuccess('Connected to peer successfully');
    } else if (peerConnection.connectionState === 'failed') {
      showError('Connection failed. Attempting to reconnect...');
      peerConnection.restartIce();
    }
  };

  // Remote stream handling
  peerConnection.ontrack = (event) => {
    console.log(`Received remote stream from ${userId}`, event);
    
    if (!event.streams || event.streams.length === 0) {
      console.error('No streams in track event');
      return;
    }
    
    const remoteStream = event.streams[0];
    
    // Check if we already have a video container for this peer
    const existingContainer = document.querySelector(`[data-peer-id="${userId}"]`);
    if (existingContainer) {
      console.log('Updating existing video container');
      const existingVideo = existingContainer.querySelector('video');
      if (existingVideo.srcObject !== remoteStream) {
        existingVideo.srcObject = remoteStream;
      }
      return;
    }
    
    const videoContainer = createVideoElement(userId, remoteStream);
    videoGrid.appendChild(videoContainer);
    
    // Store video container reference
    peerConnection.remoteVideo = videoContainer;
    
    // Log when tracks end
    remoteStream.getTracks().forEach(track => {
      track.onended = () => {
        console.log(`Remote ${track.kind} track ended from ${userId}`);
        if (peerConnection.remoteVideo) {
          peerConnection.remoteVideo.remove();
        }
      };
    });
  };

  return peerConnection;
};

// Create video element for remote stream
const createVideoElement = (userId, remoteStream) => {
  const remoteVideo = document.createElement('video');
  remoteVideo.srcObject = remoteStream;
  remoteVideo.autoplay = true;
  remoteVideo.playsInline = true;
  
  const videoContainer = document.createElement('div');
  videoContainer.className = 'video-container';
  videoContainer.setAttribute('data-peer-id', userId);
  videoContainer.appendChild(remoteVideo);
  
  const nameTag = document.createElement('div');
  nameTag.className = 'name-tag';
  nameTag.innerHTML = `
    <span>Participant (${userId.slice(0, 5)})</span>
    <div class="mic-status unmuted"></div>
  `;
  videoContainer.appendChild(nameTag);
  
  return videoContainer;
};

// Leave room
const leaveRoom = () => {
  console.log('Leaving room...');
  socket.emit('leave-room');
  
  // Clean up all peer connections
  peerConnections.forEach((pc, userId) => {
    console.log(`Closing connection with ${userId}`);
    if (pc.remoteVideo) {
      pc.remoteVideo.remove();
    }
    pc.close();
  });
  
  peerConnections.clear();
  remotePeers.clear();
  
  // Stop all tracks
  if (myStream) {
    myStream.getTracks().forEach(track => {
      track.stop();
      console.log(`Stopped local ${track.kind} track`);
    });
  }
  
  // Redirect to lobby
  window.location.href = '/';
};

// Socket event handlers
socket.on('connect', () => {
  console.log('Connected to signaling server');
  loadingOverlay.style.display = 'none';
  initializeMedia();
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  showError('Connection error. Retrying...');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  if (reason === 'io server disconnect') {
    showError('Server disconnected. Please refresh the page.');
  }
});

socket.on('user-connected', async (userId) => {
  console.log(`User ${userId} connected to room`);
  
  try {
    // Create a new peer connection
    const peerConnection = createPeerConnection(userId);
    peerConnections.set(userId, peerConnection);
    remotePeers.add(userId);

    // Create and send offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    console.log(`Sending offer to ${userId}`);
    socket.emit('offer', {
      offer,
      targetUserId: userId
    }, ROOM_ID);
    
  } catch (error) {
    console.error('Error creating offer:', error);
    showError('Failed to establish connection');
  }
});

socket.on('offer', async (data) => {
  const { offer, senderId } = data;
  console.log(`Received offer from ${senderId}`);
  
  try {
    let peerConnection;
    
    // Check if we already have a connection
    if (peerConnections.has(senderId)) {
      console.log(`Updating existing connection for ${senderId}`);
      peerConnection = peerConnections.get(senderId);
      
      // Clean up existing connection
      if (peerConnection.remoteVideo) {
        peerConnection.remoteVideo.remove();
      }
      
      // Close and remove old connection
      peerConnection.close();
      peerConnections.delete(senderId);
    }
    
    // Create new peer connection
    peerConnection = createPeerConnection(senderId);
    peerConnections.set(senderId, peerConnection);
    remotePeers.add(senderId);
    
    // Set remote description and create answer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    console.log(`Sending answer to ${senderId}`);
    socket.emit('answer', {
      answer,
      targetUserId: senderId
    }, ROOM_ID);
    
  } catch (error) {
    console.error('Error handling offer:', error);
    showError('Failed to process connection request');
  }
});

socket.on('answer', async (data) => {
  const { answer, senderId } = data;
  console.log(`Received answer from ${senderId}`);
  
  try {
    const peerConnection = peerConnections.get(senderId);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } else {
      console.error(`No peer connection found for ${senderId}`);
    }
  } catch (error) {
    console.error('Error handling answer:', error);
    showError('Failed to process connection response');
  }
});

socket.on('ice-candidate', async (data) => {
  const { candidate, senderId } = data;
  console.log(`Received ICE candidate from ${senderId}`);
  
  try {
    const peerConnection = peerConnections.get(senderId);
    if (peerConnection) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      console.error(`No peer connection found for ${senderId}`);
    }
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
  }
});

socket.on('user-disconnected', (userId) => {
  console.log(`User ${userId} disconnected`);
  
  // Clean up peer connection
  const peerConnection = peerConnections.get(userId);
  if (peerConnection) {
    if (peerConnection.remoteVideo) {
      peerConnection.remoteVideo.remove();
    }
    peerConnection.close();
    peerConnections.delete(userId);
  }
  
  remotePeers.delete(userId);
});

socket.on('error', (message) => {
  showError(message);
});

// Add socket event handler for audio state changes
socket.on('audio-state-change', (data) => {
  const { userId, isAudioEnabled } = data;
  console.log(`User ${userId} audio state changed to ${isAudioEnabled ? 'unmuted' : 'muted'}`);
  
  const peerContainer = document.querySelector(`[data-peer-id="${userId}"]`);
  if (peerContainer) {
    const micStatus = peerContainer.querySelector('.mic-status');
    micStatus.className = `mic-status ${isAudioEnabled ? 'unmuted' : 'muted'}`;
  }
});

// Add CSS for rotation animation
const style = document.createElement('style');
style.textContent = `
  .rotating {
    animation: rotate 0.5s ease;
  }
  
  @keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);