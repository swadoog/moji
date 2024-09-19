const vscode = require("vscode");

/**
* @param {vscode.ExtensionContext} context
*/
function activate(context) {
    console.log('$ executed activate function;');
    
    let disposable = vscode.commands.registerCommand(
        "radix.helloWorld",
        function () {
            const panel = vscode.window.createWebviewPanel(
                "helloWorld",
                "Alpha",
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                }
            );
            
            // Img
            const onDiskPath = vscode.Uri.file(vscode.Uri.joinPath(context.extensionUri, 'images', 'ascii_image.png').fsPath);
            const imgSrc = panel.webview.asWebviewUri(onDiskPath);
            
            panel.webview.html = getWebviewContent(context, imgSrc);
            
            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'alert':
                        vscode.window.showInformationMessage(message.text);
                        break;
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    );
    
    // Execute the command immediately to show the welcome page on startup
    vscode.commands.executeCommand("radix.helloWorld");
    
    context.subscriptions.push(disposable);
}

function getWebviewContent(context, img) {
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Hello World</title>
        <style>
          body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #000;
            color: #fff;
            font-family: monospace;
            white-space: pre;
          }
          img {
            margin-top: 20px;
            max-height: 50%;
            max-width: 70%;
          }
        </style>
      </head>
      <body>
        <h1>Hello World</h1>
        <img src="${img}" alt="ASCII Image" id="asciiImage">
        <button id="clickMe">Click me</button>
        <script>
          const vscode = acquireVsCodeApi();
          document.getElementById('asciiImage').addEventListener('click', function() {
            vscode.postMessage({
              command: 'alert',
              text: 'You clicked the image!'
            });
          });
  
          document.addEventListener('keydown', function(event) {
            if (event.key === 'h') {
              vscode.postMessage({
                command: 'alert',
                text: 'You pressed the "h" key!'
              });
            }
          });
  
          document.getElementById('clickMe').addEventListener('click', function() {
            vscode.postMessage({
              command: 'alert',
              text: 'You clicked the button!'
            });
          });
        </script>
      </body>
    </html>
  `;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate,
};
