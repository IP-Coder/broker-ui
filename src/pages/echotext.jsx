import Echo from "laravel-echo";

window.Echo = new Echo({
  broadcaster: "pusher",
  key: "e26d133e2a3424c3ccc7",
  cluster: "ap2",
  forceTLS: true,
});

var channel = Echo.channel("my-channel");
channel.listen(".my-event", function (data) {
  alert(JSON.stringify(data));
});
