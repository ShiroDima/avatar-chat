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

    console.log('Peer Connection created')
    console.log(await peerConnection?.getStats())
    return sessionClientAnswer;
}

async function connect(imageURL) {
    if (peerConnection) {
        closePC();
    }

    let {offer, iceServers} = await createStream(imageURL)


    await createPeerConnection(offer, iceServers);
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

