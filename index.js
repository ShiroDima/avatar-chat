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
let BACKENDURL = ENV==='local' ? 'http://127.0.0.1:8000': "https://bpfrhiahgezoa2hkzquyu534q40ypvzj.lambda-url.us-east-1.on.aws"
let API_KEY = axios
    .post(`${BACKENDURL}/get_key`)
    .then(response => {return response.data})
    .catch(error => console.log(error))

let peerConnection
let sessionClientAnswer
let sessionId
let streamId
const maxRetryCount = 3
const maxDelaySec = 4
let statsIntervalId
let videoIsPlaying = false
let lastBytesReceived
let localVideoStream
let localAudioStream
let videoRecorder
let audioRecorder
let formData = new FormData()
let currentUnit = "SI"
// let expression = ""
let talkStreamConfig = {
    script: {
        type: 'text',
        subtitles: false,
        provider: {type: 'microsoft', voice_id: 'en-US-JasonNeural'},
        ssml: false,
        input: ""
    },
    config: {
        fluent: false,
        pad_audio: 0.0,
        stitch: true,
        driver_expressions: {
            expressions: [{
                expression: "neutral",
                start_frame: 0,
                intensity: 0.4
            }]
        }},
    session_id: ""
}

let userHappy = false
let userSad = false
let userAngry = false
let userFear = false

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


// Talk Button Element
connectBtn = document.getElementById('connect-button')

// Start Button Element
talkBtn = document.getElementById('talk-button')

// Converse Button Element
converseBtn = document.getElementById('converse-button')

// Destroy Button Element
destroyBtn = document.getElementById('destroy-button')

// BMI Weight Input
weightBtn = document.getElementById("bmi__weight")

// BMI Height Input
heightBtn = document.getElementById("bmi__height")

// BMI Calculate Button
bmiCalcBtn = document.getElementById("bmi__calculate")

// SI Unit Button
siBtn = document.querySelector("#bmi__unit_select > span:nth-child(1) > button")

// US Unit Button
usBtn = document.querySelector("#bmi__unit_select > span:nth-child(2) > button")

// Webcam Video Element
talkVideo = document.getElementById('talk-video')

// AI Video Element
aiVideo = document.getElementById('ai-video')

// Connected Button Element
connectedBtn = document.getElementById('status__connect')

// Disconnected Button Element
disconnectedBtn = document.getElementById('status__disconnect')

// Image Input Label
imgLabel = document.getElementById('settings__image_label')

// Image Input
imgInput = document.getElementById('settings__image')

// Voice Select Element
voiceSelect = document.getElementById('settings__voice_select')

// Settings Submit Button
settingsSubmit = document.getElementById('settings__submit')

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

function changeUploadLabel(fileName){
    // document.querySelector('#settings__image_label i').classList.remove('fa-cloud-upload-alt')
    // document.querySelector('#settings__image_label i').classList.add('fa-file-alt')
    document.querySelector('#settings__image_label').innerHTML = `<i class="fas fa-file-alt text-2xl text-gray-300 mx-3"
                           id="file_upload_icon"
                        ></i> ${fileName}`
}

(async function() {
    disable(converseBtn)
    await createOptions()
    // connect()

    document.getElementById("settings__close").onclick = async () => {
        if(!sessionId){
            await connect()
            document.getElementById("settings").classList.add('hidden')
        }else {
            document.getElementById("settings").classList.add('hidden')
        }
    }
    document.getElementById("settings__open").onclick = () => document.getElementById("settings").classList.remove('hidden')

    disconnectedBtn.onclick = () => connect()
    connectedBtn.onclick = async () => {
        await fetch(`https://api.d-id.com/talks/streams/${streamId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Basic ${await API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ session_id: sessionId }),
        });

        closePC()
        stopAllStreams()
    }

    usBtn.onclick = () => {
        usBtn.classList.toggle('bg-gray-500')
        usBtn.classList.toggle('cursor-not-allowed')
        siBtn.classList.toggle('bg-gray-500')
        siBtn.classList.toggle('cursor-not-allowed')
        currentUnit = "US"
        switchUnits()
    }

    siBtn.onclick = () => {
        siBtn.classList.toggle('bg-gray-500')
        siBtn.classList.toggle('cursor-not-allowed')
        usBtn.classList.toggle('bg-gray-500')
        usBtn.classList.toggle('cursor-not-allowed')
        currentUnit = "SI"

        switchUnits()
        // siBtn.classList.add('cursor-not-allowed')
    }

    voiceSelect.onchange = () => {
        // talkStreamConfig.script.provider.type = "amazon"
        // console.log(voiceSelect.options[voiceSelect.selectedIndex].text.split(" ", 1))
        talkStreamConfig.script.provider.voice_id = voiceSelect.options[voiceSelect.selectedIndex].value
    }

    imgInput.onchange = (event) => {
        // document.getElementById('settings__image_label').innerText = event.dataTransfer.files[0].name
        changeUploadLabel(event.target.files[0].name)
        formData.append("image", event.target.files[0])
    }
    // imgInput.onchange = (event) => processImage(event)
    settingsSubmit.onclick = () => submitSettings()

    // console.log(await API_KEY)


    imgLabel.ondragenter = (event) => {
        event.stopPropagation()
        event.preventDefault()
    }

    imgLabel.ondragover = (event) => {
        event.stopPropagation()
        event.preventDefault()
    }

    imgLabel.ondrop = (event) => {
        event.stopPropagation()
        event.preventDefault()
        changeUploadLabel(event.dataTransfer.files[0].name)
        formData.append("image", event.dataTransfer.files[0])
    }

    try{
        const constraints = {
            video: {
                facingMode: {exact: 'user'},
                width: 500,
                height: 500
            }
        }
        localVideoStream = await navigator.mediaDevices.getUserMedia(constraints)
        localAudioStream = await navigator.mediaDevices.getUserMedia({audio: true})



        // talkVideo.srcObject = localVideoStream
        videoRecorder = new MediaRecorder(localVideoStream)
        audioRecorder = new MediaRecorder(localAudioStream)

        videoRecorder.start(30e3)

        videoRecorder.ondataavailable = async (event) => {
            let formData = new FormData()
            formData.append('video', event.data)
            // sock.emit('stream', {data: event.data, kind: 'video'})
            // sock.send({data: event.data, kind: 'video'})
            // console.log(`Data type: ${typeof event.data}`)
            // console.log(`Video Chunks: ${await event.data.arrayBuffer()[0]}`)
            // videoChunks.push(event.data)

            // axios
            //     .post(`${URL}/stream`, {
            //         kind: 'video',
            //         data: videoChunks.pop()
            //     })
            //     .then(response => console.log(response))
            //     .catch(error => console.log(error))

            // let img = new Image()
            // img.src = URL.createObjectURL(event.data)
            // // URL.createObjectURL()
            // console.log(img)

            axios
                .post(`${BACKENDURL}/video_stream`, formData)
                .then(async (response) => {
                    // talkStreamConfig.config.driver_expressions.expressions[0].expression = response.data[0]
                    console.log(response.data[0])

                    await queryEmotions(response.data[0])
                    // console.log(talkStreamConfig)
                })
                .catch(error => console.log(error))

            // videoChunks = []
        }

        audioRecorder.ondataavailable = async (event) => {
            // socket.send(event.data)
            let formData = new FormData()
            formData.append('audio', event.data)

            axios
                .post(`${BACKENDURL}/audio_stream`, formData)
                .then(async (response) => {
                    // console.log(response.data)
                    await getAIResponse(response.data)

                    // console.log(talkStreamConfig)
                    // talkStreamConfig.script.input = await getAIResponse(response.data)
                    // await createTalkStream(await ai)
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

            // await createTalkStream()
        // }

        // console.log(uploadData)
    }catch(err){
        console.log(err)
    }

    weightBtn.oninput = () => {
        // if(weightBtn.value){
        //     showValid(weightBtn)
        // }
        // showValid(weightBtn)
        if(checkInputIsValid(heightBtn) && checkInputIsValid(weightBtn)){
            bmiCalcBtn.classList.remove("cursor-not-allowed")
        }
        if(!checkInputIsValid(weightBtn)){
            if(!bmiCalcBtn.classList.contains("cursor-not-allowed")){
                bmiCalcBtn.classList.add("cursor-not-allowed")
            }
        }
    }
    heightBtn.oninput = () => {
        // if(heightBtn.value){
        //     showValid(heightBtn)
        // }
        // showValid(heightBtn)
        if(!checkInputIsValid(heightBtn)){
            if(!bmiCalcBtn.classList.contains("cursor-not-allowed")){
                // console.log("already disabled")
                bmiCalcBtn.classList.add("cursor-not-allowed")
            }
        }
        if(checkInputIsValid(weightBtn) && checkInputIsValid(heightBtn)){
            bmiCalcBtn.classList.remove("cursor-not-allowed")
        }

    }

    bmiCalcBtn.onclick =  async (event) => {
        event.preventDefault()

        let weight = Number(weightBtn.value)
        let height = Number(heightBtn.value)
        let BMI = currentUnit === "SI" ? weight/Math.pow(height, 2) : (weight/Math.pow(height, 2))*703
        if(currentUnit==="SI"){
            console.log(`BMI [kg/m2]:\t${BMI}`)
        }else{
            console.log(`BMI [lb/in2]:\t${BMI}`)
        }

        if(!aiTurn){
            prompt = `My BMI is ${Math.round(BMI)}. Give me very general health advice in two sentences.`

            try{
                await getAIResponse(prompt)
                // await createTalkStream()
            }catch(error){
                alert("Please connect to the service first!")
            }
        }

    }

    //
})()

// main()

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
        peerConnection.addEventListener(
            "icegatheringstatechange",
            onIceGatheringStateChange,
            true
        );
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

async function connect(imageURL) {
    if (peerConnection) {
        closePC();
    }

    let {offer, iceServers} = await createStream(imageURL)


    await createPeerConnection(offer, iceServers);
}

async function createStream(imageURL){
    let session = await fetchWithRetries(`https://api.d-id.com/talks/streams`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${await API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            // source_url: `${avatarImage}`,
            source_url: (typeof imageURL === "string") ?  imageURL : "https://cdn.pixabay.com/photo/2021/06/04/10/28/portrait-6309448_1280.jpg" ,
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
    sessionId = newSessionId
    talkStreamConfig.session_id = newSessionId;

    return {
        offer,
        iceServers
    }
}

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
    if (
        peerConnection?.signalingState === "stable" ||
        peerConnection?.iceConnectionState === "connected"
    ){
        if(!aiTurn){
            if(localVideoStream !== null && localAudioStream !== null){
                // videoRecorder.start()
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
            // videoRecorder.stop()
            audioRecorder.stop()
            console.log('Recording ended...')
            disable(converseBtn)
            // enable(converseBtn)
            // console.log(`Upload data before POST request: ${uploadData.video_data}`)
            // transcribeAudio(uploadData)
            // await createTalkStream()
            // aiTurn = false
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
    //     // disable(converseBtn)
    //     enable(converseBtn)
        // console.log(`Upload data before POST request: ${uploadData.video_data}`)
        // transcribeAudio(uploadData)
        // aiTurn = false
        // formData.forEach(data => console.log(data))
        // formData = new FormData
    // }



})

// destroyBtn.addEventListener('click', async (event) => {
//     await fetch(`https://api.d-id.com/talks/streams/${streamId}`, {
//         method: "DELETE",
//         headers: {
//             Authorization: `Basic ${await API_KEY}`,
//             "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ session_id: sessionId }),
//     });

//     stopAllStreams();
//     closePC();
//     hide(document.getElementById('status__connected'))
//     show(document.getElementById('status__disconnected'))
// })

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
        }, 2);
    }
}

async function onIceGatheringStateChange() {
    // console.log(peerConnection?.iceGatheringState)
    if(peerConnection?.iceGatheringState === "complete"){
        talkStreamConfig.config.driver_expressions.expressions[0].expression = "happy"
        talkStreamConfig.script.input = "Hello! How may I help you?"
        // await createTalkStream()
        setTimeout(async () => await createTalkStream(), 2e3)
    }
}

async function onIceConnectionStateChange() {
    // peerConnection?.iceConnectionState
    if (
        peerConnection?.iceConnectionState === "failed" ||
        peerConnection?.iceConnectionState === "closed"
    ) {
        stopAllStreams();
    }
        // else if(peerConnection.iceConnectionState === "completed"){
    //     console.log('Ice connection state completed')
    //     talkStreamConfig.config.driver_expressions.expressions[0].expression = "happy"
    //     talkStreamConfig.script.input = "Hello! How may I help you?"
    //     await createTalkStream()
    // }
}

async function onConnectionStateChange() {
    // peerConnStatus.innerText = peerConnection?.connectionState
    if(peerConnection?.connectionState === "connected"){
        show(connectedBtn)
        hide(disconnectedBtn)
        enable(converseBtn)
        // talkStreamConfig.config.driver_expressions.expressions[0].expression = "happy"
        // talkStreamConfig.script.input = "Hello! How may I help you?"
        // await createTalkStream()
    }
}

async function onSignalingStateChange() {
    // signalStatus.innerText = peerConnection?.signalingState
    // peerConnection?.signalingState === "stable" ? showGreen(signalStatus) : null
    // if(peerConnection.signalingState === "stable"){
    //     talkStreamConfig.config.driver_expressions.expressions[0].expression = "happy"
    //     talkStreamConfig.script.input = "Hello! How may I help you?"
    //     await createTalkStream()
    //     // setTimeout(async () => await createTalkStream(), 0.1e3)
    // }
}

function onVideoStatusChange(videoIsPlaying, stream) {
    // let status;
    if (videoIsPlaying) {
        // status = "streaming";
        setVideoElement(stream);
        disable(converseBtn)
    } else {
        // status = "empty";
        enable(converseBtn)
        aiTurn = false
        // playIdleVideo();
    }
    // streamStatus.innerText = status;
    // status==="streaming" ? showGreen(streamStatus) : null
}

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

function stopAllStreams() {
    videoRecorder.stop()
    audioRecorder.stop()

    if (aiVideo.srcObject) {
        console.log("stopping remote video streams");
        let mediaStream = aiVideo.srcObject;
        mediaStream.getTracks().forEach((track) => {
            track.stop()
        });
        aiVideo.srcObject = null;

        // console.log(localVideoStream)

    }
    if(localVideoStream.getTracks() && localAudioStream.getTracks()){
        console.log("stopping remote video streams");
        localVideoStream.getTracks().forEach((track) => {
            console.log(`Stopping track ${track}`)
            track.stop()
        })
        localAudioStream.getTracks().forEach((track) => {
            console.log(`Stopping track ${track}`)
            track.stop()
        })
    }
}

function closePC(pc = peerConnection) {
    if (!pc) return;
    console.log('stopping peer connection');
    pc.close();
    pc.removeEventListener('icegatheringstatechange', onIceGatheringStateChange, true);
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
    hide(connectedBtn)
    show(disconnectedBtn)
    disable(converseBtn)
    if (pc === peerConnection) {
        peerConnection = null;
    }
}

async function getAIResponse(text){
    talkStreamConfig.script.input = await axios
        .post(`${BACKENDURL}/response`, {transcribed_text: text})
        .then(response => {
            return response.data
        })
        .catch(error => console.log(error))

    try{
        await createTalkStream()
    }catch(error){

    }
    // return
}

async function createTalkStream(){
    if(!sessionId){
        throw new Error('Session ID does not exist!')
    }
    const options = {
        method: 'POST',
        // url: `https://api.d-id.com/talks/streams/${streamId}`,
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: `Basic ${await API_KEY}`
        },
        data: JSON.stringify(talkStreamConfig)
    };

    if(!videoIsPlaying){
        // axios
        //     .request(options)
        //     .then(function (response) {
        //         return null;
        //     })
        //     .catch(function (error) {
        //         console.error(error);
        //         enable(converseBtn)
        //     });
        try{
            await fetchWithRetries(`https://api.d-id.com/talks/streams/${streamId}`, {
                method: 'POST',
                // url: `https://api.d-id.com/talks/streams/${streamId}`,
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    authorization: `Basic ${await API_KEY}`
                },
                body: JSON.stringify(talkStreamConfig)
            }, 1)
        }catch(error){
            alert('Failed to create ai response')
        }

    }
    else{
        throw new Error("Another stream is in progress")
    }
    //
    // axios
    //     .request(options)
    //     .then(response => console.log(response))
    //     .catch(error => console.log(error))
}

function checkInputIsValid(element){
    return !(isNaN(Number(element.value)) || !element.value);
}

// function showValid(element){
//     if(!checkInputIsValid(element)){
//         element.classList.remove("focus:outline-none")
//         element.classList.add("outline", "outline-offset-2", "outline-red-600", "focus:outline-red-600")
//     }else{
//         element.classList.remove("outline", "outline-offset-2", "outline-red-600", "focus:outline-red-600")
//         element.classList.add("focus:outline-none")
//     }
// }

function switchUnits(){
    if(currentUnit==="US"){
        document.getElementById("bmi__weight_unit").innerText = "lb"
        document.getElementById("bmi__height_unit").innerText = "in"
    }else{
        document.getElementById("bmi__weight_unit").innerText = "kg"
        document.getElementById("bmi__height_unit").innerText = "m"
    }
}

async function queryEmotions(emotion){
    // console.log(emotion)

    talkStreamConfig.config.driver_expressions.expressions[0].expression = !(emotion==="happy") ? "serious" : emotion
    prompt = `I want you to act concerned by asking 2 questions. Reply like it was something you noticed.

                                            My emotion is ${emotion}`
    if(emotion==="happy" && (!(aiVideo.srcObject===null) || !videoIsPlaying)){
        console.log("The user is happy!")
        if(!userHappy){
            userHappy = true
            await getAIResponse(prompt)
        }
    }
    else if(emotion==="sad" && (!(aiVideo.srcObject===null) || !videoIsPlaying)){
        if(!userSad){
            userSad = true
            await getAIResponse(prompt)
        }
    }
    else if(emotion==="fear" && (!(aiVideo.srcObject===null) || !videoIsPlaying)){
        if(!userFear){
            userFear = true
            await getAIResponse(prompt)
        }
    }
    else if(emotion==="angry" && (!(aiVideo.srcObject===null) || !videoIsPlaying)){
        if(!userAngry){
            userAngry = true
            await getAIResponse(prompt)
        }
    }
}

async function createOptions(){
    axios
        .get("https://api.d-id.com/tts/voices?provider=microsoft", {
            headers: {
                "accept": "application/json",
                "Authorization": `Basic ${await API_KEY}`
            }
        })
        .then(response => {
            response.data.forEach(voice => {
            //     // console.log(`Name: ${voice.name}\t | \t Accent: ${voice.labels.accent} \t | \t Gender: ${voice.labels.gender}`)
                let opt = document.createElement('option')
                opt.text = `${voice.name}\t|\t${voice.gender.toUpperCase()}\t|\t${voice.language.split(" ", 1)[0].toUpperCase()}`
                opt.value = voice.id
            //     // opt.data-tooltip-target = "tooltip-default"
                voiceSelect.add(opt)
            })
            // response.data.forEach(voice => {
            //     console.log(voice)
            // })
        })
        .catch(error => console.log(error.toString()))
}

// async function

function processImage(event) {
    // document.querySelector('#__ai_mixing_btn').textContent = 'Generate Mastered Song'
    // Object.values(event.target.files).forEach(async file => formData.append(file.name, await file.arrayBuffer()))
    let imageFile = event.target.files[0]
    let reader = new FileReader()
    reader.readAsBinaryString(imageFile);

    reader.onload = () => {
        formData.append("image", imageFile)
    }

    // console.log(event.target.files)


}

async function submitSettings(){
    // formData.forEach(data => console.log(data))
    // console.log(formData.has("image"))
    if(formData.has("image")){
        axios
            .post(`${BACKENDURL}/image_upload`, formData)
            .then(async response => {
                // console.log(response.data)
                // !sessionId ? await connect(response.data) : await createStream(response.data)
                await connect(response.data)
                document.getElementById("settings").classList.add('hidden')
            })
            .catch(error => console.log(error.toString()))
    }else{
        // !sessionId ? await connect() : null
        document.getElementById("settings").classList.add('hidden')
    }

}
