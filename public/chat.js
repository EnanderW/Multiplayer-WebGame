const form = document.getElementById("chatForm");
const chatContainer = document.getElementById("chatContainer");
const input = document.getElementById("chatInput");

function setupChat(socket) {
  form.onsubmit = function(event) {
    event.preventDefault();
    socket.emit('serverMessage', input.value);
    input.value = "";
  }

  socket.on('clientMessage', function(data) {
    chatContainer.innerHTML += "<p>" + data + "</p>";
    chatContainer.scrollTop = chatContainer.scrollHeight;
    if (chatContainer.children.length > 50) {
      var children = chatContainer.getElementsByTagName('p');
      chatContainer.removeChild(children[0]);
    }

    //if (fullContainer.style.opacity ==)
    chatContainer.classList.remove("run-animation");
    void chatContainer.offsetWidth;
    chatContainer.classList.add("run-animation");
  });
}
