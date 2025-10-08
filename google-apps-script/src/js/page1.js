/**
 * This is a sample front page for a Google Apps Script web app, where it:
 * - initializes the session
 * - waits for the DOM to be ready
 * - calls "postSiteInited"
 * - sets up event listeners.
 * - sends a custom event to the parent website to modify the URL parameters without refreshing.
 */

initializeSession(() => {
  if (document.readyState !== "loading")
    onDomContentLoaded();
  else
    document.addEventListener('DOMContentLoaded', () => onDomContentLoaded());
});

async function onDomContentLoaded() {
  postSiteInited(); //tells the parent to show the iframe and stop the "loading" progress.

  //simulate some seconds of wait
  setTimeout(async () => {
    document.getElementById('bodyBottom').style.display = "";
    document.getElementById('button1').addEventListener('click', function () {
      console.log('Button clicked');
      analytics("customEvent1"); //sample custom event
      alert("event sent to website");
    });

    let user = null;
    document.getElementById('buttonLogin').addEventListener('click', async function () {
      alert("Note: this demo page does not have valid Firebase Login credentials");
      const data = await getUser(true, true);
      if (data && data.user) {
        user = data.user;
        //data.user is not secure. the backen should verify the idToken with verifyFirebaseIdToken_
        alert("Welcome " + data.user.email);
      }
    });

    document.getElementById('buttonLogout').addEventListener('click', async function () {
      if (!user) {
        alert("no user logged in");
        return;
      }
      await logoutUser();
      alert("logged out");
    });

    //tell the website to change a url parameter
    postSiteMessage("urlParamChange",
      {
        refresh: false,
        urlParams: {
          lang: "en"
        }
      });
  }, 3000);
}
