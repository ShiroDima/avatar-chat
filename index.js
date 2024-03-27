// async function getData(){
//
//     let config = fetch('./config.json')
//         .then(response => response.json())
//         .then(data => {return data})
//
//     return await config
// }

let ENV = 'production'
let BACKENDURL = ENV ==='local' ? 'http://127.0.0.1': "https://maysapi.talk2mays.com"
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
let languageName = new Intl.DisplayNames(['en'], {type: 'language'})
let audioRecorder
let imageFormData = new FormData()
let currentUnit = "SI"
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
let language = 'en'
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

    disconnectedBtn.onclick = () => {
        connect()
        startAllStreams()
    }

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
        // console.log(language)
        language = voiceSelect.options[voiceSelect.selectedIndex].text.split(' | ')[2] == "ARABIC" ? "ar" : "en"
        // console.log(voiceSelect.options[voiceSelect.selectedIndex].text.split(' | ')[3])
        // console.log(language)
    }

    imgInput.onchange = (event) => {
        // document.getElementById('settings__image_label').innerText = event.dataTransfer.files[0].name
        changeUploadLabel(event.target.files[0].name)
        imageFormData.append("image", event.target.files[0])
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
        imageFormData.append("image", event.dataTransfer.files[0])
    }

    try{
        startAllStreams()
    }catch(err){
        console.log(err)
    }

    weightBtn.oninput = () => {
        if(heightBtn.value && weightBtn.value){
            bmiCalcBtn.classList.remove("cursor-not-allowed")
        }
        if(!weightBtn.value){
            if(!bmiCalcBtn.classList.contains("cursor-not-allowed")){
                bmiCalcBtn.classList.add("cursor-not-allowed")
            }
        }
    }

    heightBtn.oninput = () => {
        if(!heightBtn.value){
            if(!bmiCalcBtn.classList.contains("cursor-not-allowed")){
                // console.log("already disabled")
                bmiCalcBtn.classList.add("cursor-not-allowed")
            }
        }
        if(heightBtn.value && weightBtn.value){
            bmiCalcBtn.classList.remove("cursor-not-allowed")
        }

    }

    bmiCalcBtn.onclick =  async (event) => {
        event.preventDefault()

        let weight = Number(weightBtn.value)
        let height = Number(heightBtn.value)
        let BMI = currentUnit === "SI" ? weight/Math.pow(height, 2) : (weight/Math.pow(height, 2))*703
        // if(currentUnit==="SI"){
        //     console.log(`BMI [kg/m2]:\t${BMI}`)
        // }else{
        //     console.log(`BMI [lb/in2]:\t${BMI}`)
        // }

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

})()

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

converseBtn.addEventListener('click', async (event) => {
    if (
        peerConnection?.signalingState === "stable" ||
        peerConnection?.iceConnectionState === "connected"
    ){
        if(!aiTurn){
            if(localAudioStream !== null){
                audioRecorder.start()
                console.log('Recording started...')
                let val = 1
                document.querySelectorAll('.wave .bar').forEach((bar, idx) => {
                    val = idx <= 4 ? val - 0.2 : idx == 5 ? val : val + 0.2
                    bar.style.animation = `movement 0.5s ease-in-out  ${val.toPrecision(2)}s infinite`
                    // bar.style.animation-delay
                })
                aiTurn = true
                // if(converseBtn.classList.contains('disabled')){
                //     enable(converseBtn)
                // }
            }else{
                throw new Error('Audio and Video streams are not available!')
            }
        }else{
            audioRecorder.stop()
            console.log('Recording ended...')
            document.querySelectorAll('.wave .bar').forEach((bar, idx) => {
                bar.style.animation = null
                // bar.style.animation-delay
            })
            disable(converseBtn)
        }
    }
})

function setVideoElement(stream) {
    if (!stream) return;
    aiVideo.srcObject = stream;
    // talkVideo.loop = true;
}

async function startAllStreams(){
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

    videoRecorder.start(120e3)
    //
    videoRecorder.ondataavailable = async (event) => {
        let formData = new FormData()
        formData.append('video', event.data)
        axios
            .post(`${BACKENDURL}/video_stream`, formData)
            .then(async (response) => {
                // talkStreamConfig.config.driver_expressions.expressions[0].expression = response.data[0]
                // console.log(response.data[0])

                await queryEmotions(response.data[0])
                // console.log(talkStreamConfig)
            })
            .catch(error => console.log(error))

    }

    audioRecorder.ondataavailable = async (event) => {
        // socket.send(event.data)
        let formData = new FormData()
        formData.append('audio', event.data)

        axios
            .post(`${BACKENDURL}/audio_stream/?language=${language}`, formData)
            .then(async (response) => {
                await getAIResponse(response.data)
            })
            .catch(error => {
                console.log(error)
                enable(converseBtn)
                aiTurn = false
            })

    }
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
    // if(localAudioStream.getTracks()){
    //     localAudioStream.getTracks().forEach((track) => {
    //         console.log(`Stopping track ${track}`)
    //         track.stop()
    //     })
    // }
}

async function getAIResponse(text){
    talkStreamConfig.script.input = await axios
        .post(`${BACKENDURL}/response`, {transcribed_text: text, language: languageName.of(language)})
        .then(response => {
            return response.data
        })
        .catch(error => console.log(error))

    try{
        await createTalkStream()
    }catch(error){
        console.log(error)
    }
    // return
}

async function createTalkStream(){
    if(!sessionId){
        throw new Error('Session ID does not exist!')
    }

    if(!videoIsPlaying){
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
}

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
    if(!(aiVideo.srcObject===null) || !videoIsPlaying){
        if(emotion==="happy"){
            // console.log("The user is happy!")
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
                if(voice.language.includes('English') || voice.language.includes('Arabic')){
                    let opt = document.createElement('option')
                    opt.text = `${voice.name}\t|\t${voice.gender.toUpperCase()}\t|\t${voice.language.split(" ", 1)[0].toUpperCase()}`
                    opt.value = voice.id
                    voiceSelect.add(opt)
                }
            })
        })
        .catch(error => console.log(error.toString()))
}

async function submitSettings(){
    if(imageFormData.has("image")){
        axios
            .post(`${BACKENDURL}/image_upload`, imageFormData)
            .then(async response => {
                // console.log(response.data)
                // !sessionId ? await connect(response.data) : await createStream(response.data)
                await connect(response.data)
                document.getElementById("settings").classList.add('hidden')
            })
            .catch(error => console.log(error.toString()))
    }else{
        !sessionId ? await connect() : null
        document.getElementById("settings").classList.add('hidden')
    }

}
