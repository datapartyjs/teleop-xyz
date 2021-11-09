
var viz = null

  
function openConnectionForm(){
  var modal = document.getElementById("myModal")
  modal.style.display = "block";

  var logo = document.getElementById('logo')
  logo.classList.remove('hidden')
}

function closeConnectionForm(){
  if(viz == null){
    return
  }
  var modal = document.getElementById("myModal");
  modal.style.display = "none";
  var logo = document.getElementById('logo')
  logo.classList.add('hidden')
}

function setConnectionStatus(text, color){
  const statusText = document.getElementById('status-text')
  statusText.textContent = text+' '

  const statusDot = document.getElementById('status-dot')
  statusDot.style.color = color
  statusDot.style.backgroundColor = color
}

async function init(){
console.log('init')
  const form = document.getElementsByName('connectionForm')[0]
  form.addEventListener('submit', startConnection);

  const versionText = document.getElementById('version-text')
  versionText.innerText = 'v'+teleopxyz.TeleOp.version

  // Get the modal
  var modal = document.getElementById("myModal");

  // Get the button that opens the modal
  var btn = document.getElementById("myBtn");

  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("close")[0];

  // When the user clicks on <span> (x), close the modal
  span.onclick = closeConnectionForm

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
    if (event.target == modal) {
      closeConnectionForm()
    }
  }

  document.getElementById('header').addEventListener('click', reload)
  document.getElementById('modal-footer').addEventListener('click', gotoGithub)

  document.getElementById('vr-button').addEventListener('click', startVR)

  await setConnectionStatus('Offline', 'grey')
  openConnectionForm()


  await setupServiceWorker()

}

async function startVR(){
  await viz.enterXR()
}



async function startConnection(event){
  event.preventDefault()
  console.log('startConnection')
  const formData = new FormData(event.target);
  const formProps = Object.fromEntries(formData);
  const reader = new FileReader()
  console.log(formProps)

  let fileLoad = new Promise((resolve, reject)=>{
    reader.onload = resolve
    reader.onabort = reject
    reader.addEventListener('error', reject)
  })
  
  reader.readAsText(formProps.rvizFile)

  await fileLoad

  console.log(reader.result)

  viz = new teleopxyz.TeleOp()

  window.viz = viz

  try{
    await viz.start(formProps.rosapiHost, reader.result)

    const helpText = document.getElementById('help-text')
    helpText.classList.add('hidden')

    if(await teleopxyz.TeleOp.hasWebXRSupport()){
      const vrButton = document.getElementById('vr-button')
      vrButton.classList.remove('hidden')
    }
  }
  catch(err){
    console.log('error', err)
    setConnectionStatus('Error:  '+formProps.rosapiHost, 'red')

    const helpText = document.getElementById('help-text')
    helpText.classList.remove('hidden')
    viz = null

    return
  }
  

  closeConnectionForm()

  setConnectionStatus('Connected to: '+formProps.rosapiHost, 'rgb(0, 255, 72)')

}

function reload(){
  window.location = ''+window.location
}

function gotoGithub(){
  window.location = 'https://github.com/datapartyjs/teleop-xyz'
}

function onServiceWorkerMessage(message){
  console.log('service-worker-message: ', message)

  if(viz){
    viz.onServiceWorkerMessage(message)
  }
}

function onServicerWorkerError(error){
  console.error('service-worker-error: ', error)
}

let serviceWorker

async function setupServiceWorker(){
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.register('service-worker.js')

    navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
    navigator.serviceWorker.addEventListener('error', onServicerWorkerError)

    registration.addEventListener('updatefound', ()=>{
      console.log('service-worker-registration: Update found')
    })


    if (registration.installing) {
      serviceWorker = registration.installing
      console.log('servicer-worker installing')
    } else if (registration.waiting) {
      serviceWorker = registration.waiting
      console.log('servicer-worker waiting')
    } else if (registration.active) {
      serviceWorker = registration.active
      console.log('servicer-worker active')
    }

    if (serviceWorker) {
      // logState(serviceWorker.state);
      serviceWorker.addEventListener('statechange',  (event) => {
        console.log('servicer-worker statechange ', event)
      })

    }
  } else {
      // The current browser doesn't support service workers.
      console.warn('service-worker: No service worker support')
  }
}


function docReady(fn) {
    // see if DOM is already available
    if (document.readyState === "complete" || document.readyState === "interactive") {
        // call on next available tick
        setTimeout(fn, 1);
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}

docReady(init)