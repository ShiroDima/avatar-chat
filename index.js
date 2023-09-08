// import config from './config.json' assert { type: 'json' };


// async function getData(){
//
//     let config = fetch('./config.json')
//         .then(response => response.json())
//         .then(data => {return data})
//
//     return await config
// }

let ENV = 'production'
let URL = ENV==='local' ? 'http://127.0.0.1:8000': "https://bpfrhiahgezoa2hkzquyu534q40ypvzj.lambda-url.us-east-1.on.aws"
let API_KEY = axios
    .post(`${URL}/get_key`)
    .then(response => {return response.data})
    .catch(error => console.log(error))

let peerConnection
let sessionClientAnswer
let sessionId
let streamId
const maxRetryCount = 3
const maxDelaySec = 4
let statsIntervalId
let videoIsPlaying
let lastBytesReceived
let localVideoStream
let localAudioStream
let videoRecorder
let audioRecorder
let formData = new FormData()
// const sock = io(`${URL}`, {
//     path: '/stream',
//     transport: ["websocket", "polling"]
// })
// const socket = new WebSocket(`ws://https://bpfrhiahgezoa2hkzquyu534q40ypvzj.lambda-url.us-east-1.on.aws/audio_stream`)
// socket.onmessage = async (event) => {
//     // console.log(event.data)
//     let ai = getAIResponse(event.data)
//     await createTalkStream(await ai)
// }

let aiTurn = false

// console.log(config)

// console.log(config.filter(conf => conf.id==="createStreamConfig"))

// Talk Button Element
connectBtn = document.getElementById('connect-button')

// Start Button Element
talkBtn = document.getElementById('talk-button')

// Converse Button Element
converseBtn = document.getElementById('converse-button')

// Destroy Button Element
destroyBtn = document.getElementById('destroy-button')

// Instance Element
// instanceID = document.getElementById('status__id')

// ICE Gathering Element
// iceGathering = document.getElementById('status__ICE_Gather')

// Peer Connection Element
// peerConnStatus = document.getElementById('status__peer_conn')

// Signaling Status Element
// signalStatus = document.getElementById('status__signal')

// Streaming status Element
// streamStatus = document.getElementById('status__stream')

// Webcam Video Element
talkVideo = document.getElementById('talk-video')

// AI Video Element
aiVideo = document.getElementById('ai-video')

function showGreen(element){
    // Makes the font color green
    element.classList.add('text-green-500')
}

function show(element){
    element.classList.contains('hidden') ? element.classList.remove('hidden') : null
}

function hide(element){
    !element.classList.contains('hidden') ? element.classList.add('hidden') : null
}

function disable(element){
    // element.classList.add('disabled')
    element.disabled = true
}

function enable(element){
    // element.classList.remove('disabled')
    element.disabled = false
}

let main = async () => {
    console.log(await API_KEY)
    const constraints = {
        audio: true,
        video: {
            facingMode: {exact: 'user'},
            width: 500,
            height: 500
        }
    }
    // {video: true, audio: true}
    try{
        let localVideoStream = await navigator.mediaDevices.getUserMedia(constraints)
        let localAudioStream = await navigator.mediaDevices.getUserMedia({audio: true})

        talkVideo.srcObject = localVideoStream
        videoRecorder = new MediaRecorder(localVideoStream)
        audioRecorder = new MediaRecorder(localAudioStream)

        // videoRecorder.ondataavailable = async (event) => {
        //     formData.append('video', event.data)
        //     // sock.emit('stream', {data: event.data, kind: 'video'})
        //     // sock.send({data: event.data, kind: 'video'})
        //     // console.log(`Data type: ${typeof event.data}`)
        //     // console.log(`Video Chunks: ${await event.data.arrayBuffer()[0]}`)
        //     // videoChunks.push(event.data)
        //
        //     // axios
        //     //     .post(`${URL}/stream`, {
        //     //         kind: 'video',
        //     //         data: videoChunks.pop()
        //     //     })
        //     //     .then(response => console.log(response))
        //     //     .catch(error => console.log(error))
        //
        //     axios
        //         .post(`${URL}/stream`, formData)
        //         .then(response => console.log(response))
        //         .catch(error => console.log(error))
        //
        //     videoChunks = []
        // }

        audioRecorder.ondataavailable = async (event) => {
            // socket.send(event.data)
            formData.append('audio', event.data)

            axios
                .post(`${URL}/stream`, formData)
                .then(async (response) => {
                    let ai = getAIResponse(response.data)
                    await createTalkStream(await ai)
                })
                .catch(error => console.log(error))

            // audioChunks = []
        }


        //
        // mediaRecorder.stop()
        //
        // videoRecorder.onstop = async (event) => {
        //     // console.log('Is this even triggering at all?')
        //     // uploadData.video_data = videoChunks.pop()
        //     formData.append('video', videoChunks.pop(), 'video_data.mp4')
        //     // videoBlob = new Blob(videoChunks, {type: 'video/mp4;'})
        //     // formData.append('video_data', videoChunks.pop(), 'video_data.mp4')
        //     // sock.emit('stream', {data: event.data, kind: 'video'}, (response) => {
        //     //     console.log(response.status)
        //     // })
        //
        //     // sock.on('disconnect')
        //
        //     // axios
        //     //     .post(`${URL}/stream`, formData)
        //     //     .then(response => console.log(response))
        //     //     .catch(error => console.log(error))
        //
        //     // axios
        //     //     .post(`${URL}/stream`, {
        //     //         kind: 'video',
        //     //         data: videoChunks.pop()
        //     //     })
        //     //     .then(response => console.log(response))
        //     //     .catch(error => console.log(error))
        //     //
        //     // videoChunks = []
        // }
        // audioRecorder.onstop = async (event) => {
        //     // uploadData.audio_video = audioChunks.pop()
        //     formData.append('audio', audioChunks.pop(), 'audio_data.mp4')
        //     // audioBlob = new Blob(audioChunks, {type: 'audio/mpeg;'})
        //     // audioFile.readAsBinaryString(audioBlob)
        //     // audioFile.onload = () => {
        //     //     formData.append('audio_data', audioFile.result, 'audio_data.mp4')
        //     // }
        //     // formData.append('audio_data', audioChunks, 'audio_data.mp4')
        //     // console.log(`Upload data after saving audio data: ${uploadData}`)
        //     // console.log(formData.getHeaders)
        //     // console.log(JSON.stringify(formData))
        //
        //     // axios
        //     //     .post(`${URL}/stream`, formData)
        //     //     .then(response => console.log(response))
        //     //     .catch(error => console.log(error))
        //     // console.log(audioChunks.length)
        //     // axios
        //     //     .post(`${URL}/stream`, {
        //     //         kind: 'audio',
        //     //         data: audioChunks.pop()
        //     //     })
        //     //     .then(response => console.log(response))
        //     //     .catch(error => console.log(error))
        //     //
        //     // audioChunks = []
        // }

        // console.log(uploadData)
    }catch(err){
        console.log(err)
    }

}

main()

// sock.on('transcribed', async (transcribedText) => {
//     let ai = getAIResponse(transcribedText)
//     createTalkStream(await ai)
// })

async function fetchWithRetries(url, options, retries = 1) {
    try {
        return await fetch(url, options);
    } catch (err) {
        if (retries <= maxRetryCount) {
            const delay =
                Math.min(
                    Math.pow(2, retries) / 4 + Math.random(),
                    maxDelaySec
                ) * 1000;

            await new Promise((resolve) => setTimeout(resolve, delay));

            console.log(
                `Request failed, retrying ${retries}/${maxRetryCount}. Error ${err}`
            );
            return fetchWithRetries(url, options, retries + 1);
        } else {
            throw new Error(`Max retries exceeded. error: ${err}`);
        }
    }
}

async function createPeerConnection(offer, iceServers) {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection({ iceServers });

        // Adding event listeners for any event we want to handle
        // peerConnection.addEventListener(
        //     "icegatheringstatechange",
        //     onIceGatheringStateChange,
        //     true
        // );
        peerConnection.addEventListener(
            "icecandidate",
            onIceCandidate,
            true
        );
        peerConnection.addEventListener(
            "iceconnectionsstatechange",
            onIceConnectionStateChange,
            true
        );
        peerConnection.addEventListener(
            "connectionstatechange",
            onConnectionStateChange,
            true
        );
        peerConnection.addEventListener(
            "signalingstatechange",
            onSignalingStateChange,
            true
        );
        peerConnection.addEventListener("track", onTrack, true);
    }

    await peerConnection.setRemoteDescription(offer);
    sessionClientAnswer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(sessionClientAnswer);

    const sdpResponse = await fetch(
        `https://api.d-id.com/talks/streams/${streamId}/sdp`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${await API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                answer: sessionClientAnswer,
                session_id: sessionId,
            }),
        }
    );

    return sessionClientAnswer;
}

connectBtn.addEventListener('click', async (event) => {
    // console.log(process.env.DID_API_KEY)
    let session;
    if (peerConnection && peerConnection.connectionState === "connected") {
        return;
    }

    session = await fetchWithRetries(`https://api.d-id.com/talks/streams`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${await API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            // source_url: `${avatarImage}`,
            source_url: "https://cdn.pixabay.com/photo/2021/06/04/10/28/portrait-6309448_1280.jpg",
        }),
    });

    const {
        id: newStreamId,
        offer,
        ice_servers: iceServers,
        session_id: newSessionId,
    } = await session.json();
    streamId = newStreamId;
    // instanceID.innerText = newStreamId
    sessionId = newSessionId;

    await createPeerConnection(offer, iceServers);
})

// talkBtn.addEventListener('click', async (event) => {
//     console.log('This start event is firing')
//     if (!sessionId) {
//         throw new Error("Session has not been established.");
//     }
//     if (
//         peerConnection?.signalingState === "stable" ||
//         peerConnection?.iceConnectionState === "connected"
//     ) {
//         createTalkStream()
//
//         // console.log(talkResponse.status)
//         // console.log(talkResponse)
//     }
// })

converseBtn.addEventListener('click', async (event) => {
    if (!streamId) {
        alert("Session has not been established.");
    }
    if (
        peerConnection?.signalingState === "stable" ||
        peerConnection?.iceConnectionState === "connected"
    ){
        if(!aiTurn){
            if(localVideoStream !== null && localAudioStream !== null){
                videoRecorder.start()
                audioRecorder.start()
                console.log('Recording started...')
                aiTurn = true
                // if(converseBtn.classList.contains('disabled')){
                //     enable(converseBtn)
                // }
            }else{
                throw new Error('Audio and Video streams are not available!')
            }
        }else{
            videoRecorder.stop()
            audioRecorder.stop()
            console.log('Recording ended...')
            disable(converseBtn)
            // console.log(`Upload data before POST request: ${uploadData.video_data}`)
            // transcribeAudio(uploadData)
            aiTurn = false
            // formData.forEach(data => console.log(data))
            // formData = new FormData
        }
    }

    // if(!aiTurn){
    //     if(localVideoStream !== null && localAudioStream !== null){
    //         videoRecorder.start()
    //         audioRecorder.start()
    //
    //         aiTurn = true
    //         // if(converseBtn.classList.contains('disabled')){
    //         //     enable(converseBtn)
    //         // }
    //     }else{
    //         throw new Error('Audio and Video streams are not available!')
    //     }
    // }else{
    //     videoRecorder.stop()
    //     audioRecorder.stop()
    //     disable(converseBtn)
    //     // console.log(`Upload data before POST request: ${uploadData.video_data}`)
    //     // transcribeAudio(uploadData)
    //     aiTurn = false
    //     // formData.forEach(data => console.log(data))
    //     // formData = new FormData
    // }



})

destroyBtn.addEventListener('click', async (event) => {
    await fetch(`https://api.d-id.com/talks/streams/${streamId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Basic ${await API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ session_id: sessionId }),
    });

    stopAllStreams();
    closePC();
    hide(document.getElementById('status__connected'))
    show(document.getElementById('status__disconnected'))
})

async function onIceCandidate(event) {
    if (event.candidate) {
        const { candidate, sdpMid, sdpMLineIndex } = event.candidate;

        await fetchWithRetries(`https://api.d-id.com/talks/streams/${streamId}/ice`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${await API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                candidate,
                sdpMid,
                sdpMLineIndex,
                session_id: sessionId,
            }),
        });
    }
}

// function onIceGatheringStateChange() {
//     iceGathering.innerText = peerConnection?.iceGatheringState
// }

function onIceConnectionStateChange() {
    // peerConnection?.iceConnectionState
    if (
        peerConnection?.iceConnectionState === "failed" ||
        peerConnection?.iceConnectionState === "closed"
    ) {
        stopAllStreams();
    }
}

function onConnectionStateChange() {
    // peerConnStatus.innerText = peerConnection?.connectionState
    if(peerConnection?.connectionState === "connected"){
        show(document.getElementById('status__connected'))
        hide(document.getElementById('status__disconnected'))
    }else{
        hide(document.getElementById('status__connected'))
        show(document.getElementById('status__disconnected'))
    }
}

function onSignalingStateChange() {
    // signalStatus.innerText = peerConnection?.signalingState
    // peerConnection?.signalingState === "stable" ? showGreen(signalStatus) : null
}

function onVideoStatusChange(videoIsPlaying, stream) {
    let status;
    if (videoIsPlaying) {
        // status = "streaming";
        const remoteStream = stream;
        setVideoElement(remoteStream);
    } else {
        // status = "empty";
        enable(converseBtn)
        // playIdleVideo();
    }
    // streamStatus.innerText = status;
    // status==="streaming" ? showGreen(streamStatus) : null
}

//

function onTrack(event) {
    if (!event.track) return;

    statsIntervalId = setInterval(async () => {
        const stats = await peerConnection?.getStats(event.track);
        stats?.forEach((report) => {
            if (report.type === "inbound-rtp" && report.mediaType === "video") {
                // console.log(lastBytesReceived)
                // console.log(`Bytes recieved: ${report.bytesReceived}`)
                const videoStatusChanged = videoIsPlaying !== report.bytesReceived > lastBytesReceived;
                // if(lastBytesReceived){
                //     (lastBytesReceived===report.bytesReceived) ? enable(converseBtn) : null
                //     // console.log(`Last Bytes Received: ${lastBytesReceived}`)
                //     // console.log(`Bytes Received: ${report.bytesReceived}`)
                // }
                if (videoStatusChanged) {
                    videoIsPlaying = report.bytesReceived > lastBytesReceived;
                    onVideoStatusChange(videoIsPlaying, event.streams[0]);
                    // onVideoStatusChange(videoIsPlaying, event.track);
                }
                lastBytesReceived = report.bytesReceived;
            }
        });
    }, 500);
}

function setVideoElement(stream) {
    if (!stream) return;
    aiVideo.srcObject = stream;
    // talkVideo.loop = true;
}

// function playIdleVideo() {
//     if (aiVideo) {
//         aiVideo.srcObject = null;
//         // talkVideo.current.src = "or_idle.mp4";
//         aiVideo.src = "https://cdn.pixabay.com/photo/2021/06/04/10/28/portrait-6309448_1280.jpg";
//         aiVideo.loop = true;
//         // src=
//     }
// }

function stopAllStreams() {
    if (aiVideo?.srcObject) {
        // console.log("stopping video streams");
        let mediaStream = aiVideo.srcObject;
        mediaStream.getTracks().forEach((track) => track.stop());
        aiVideo.srcObject = null;
    }
}

function closePC(pc = peerConnection) {
    if (!pc) return;
    console.log('stopping peer connection');
    pc.close();
    // pc.removeEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
    pc.removeEventListener('icecandidate', onIceCandidate, true);
    pc.removeEventListener('iceconnectionstatechange', onIceConnectionStateChange, true);
    pc.removeEventListener('connectionstatechange', onConnectionStateChange, true);
    pc.removeEventListener('signalingstatechange', onSignalingStateChange, true);
    pc.removeEventListener('track', onTrack, true);
    // clearInterval(statsIntervalId);
    // iceGathering.innerText = '';
    // signalStatus.innerText = '';
    // iceStatusLabel.innerText = '';
    // peerConnStatus.innerText = '';
    console.log('stopped peer connection');
    if (pc === peerConnection) {
        peerConnection = null;
    }
}

async function getAIResponse(text){
    let aiResponse = axios
        .post(`${URL}/response`, {transcribed_text: text})
        .then(response => {
            return response.data
        })
        .catch(error => console.log(error))

    return aiResponse
}

async function createTalkStream(textInput){
    if(!streamId){
        throw new Error('Session ID does not exist!')
    }
    const options = {
        method: 'POST',
        url: `https://api.d-id.com/talks/streams/${streamId}`,
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Basic ${await API_KEY}`
        },
        data: {
            script: {
                type: 'text',
                subtitles: false,
                provider: {type: 'microsoft', voice_id: 'en-US-JasonNeural'},
                ssml: false,
                input: textInput
            },
            config: {
                fluent: false,
                pad_audio: 0.0,
                stitch: true,
                driver_expressions: {
                    expressions: [{
                        expression: "happy",
                        start_frame: 0,
                        intensity: 0.4
                    }]
                }},
            session_id: sessionId
        }
    };

    axios
        .request(options)
        .then(function (response) {
            return null;
        })
        .catch(function (error) {
            console.error(error);
            enable(converseBtn)
        });
    //
    // axios
    //     .request(options)
    //     .then(response => console.log(response))
    //     .catch(error => console.log(error))
}